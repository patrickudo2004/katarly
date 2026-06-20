import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

async function getAuthenticatedUser(ctx: any) {
  const userId = await auth.getUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  return user;
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a borrow request.
 * - inter_dept: DeptHead/DeaconHead/SuperAdmin borrows from another department
 * - intra_dept: SubunitLead borrows from another subunit within the same dept
 */
export const createBorrowRequest = mutation({
  args: {
    targetDeptId: v.id("departments"),
    targetSubunitId: v.optional(v.id("subunits")),
    borrowType: v.union(v.literal("inter_dept"), v.literal("intra_dept")),
    role: v.string(),
    count: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    // Auth: who can request what
    const canInterDept =
      currentUser.role === "SuperAdmin" ||
      currentUser.role === "DeaconHead" ||
      currentUser.role === "DepartmentHead" ||
      currentUser.role === "DepartmentAssistant" ||
      currentUser.role === "PastoralOversight";

    const canIntraDept =
      canInterDept ||
      currentUser.role === "SubunitLead" ||
      currentUser.role === "SubunitAssistant";

    if (args.borrowType === "inter_dept" && !canInterDept) {
      throw new Error("Unauthorized: Only Department Heads can request inter-department help.");
    }
    if (args.borrowType === "intra_dept" && !canIntraDept) {
      throw new Error("Unauthorized: Only SubunitLeads or above can request intra-department help.");
    }

    // For intra_dept, the target must be in the same department
    if (args.borrowType === "intra_dept") {
      if (args.targetDeptId !== currentUser.departmentId) {
        throw new Error("Intra-department requests must target a subunit within your own department.");
      }
      if (!args.targetSubunitId) {
        throw new Error("Intra-department requests must specify a target subunit.");
      }
    }

    // Cannot borrow from own subunit
    if (
      args.targetSubunitId &&
      args.targetSubunitId === currentUser.subunitId
    ) {
      throw new Error("You cannot borrow from your own subunit.");
    }

    // Validate target dept + subunit exist
    const targetDept = await ctx.db.get(args.targetDeptId);
    if (!targetDept) throw new Error("Target department not found.");
    if (targetDept.churchId !== currentUser.churchId) {
      throw new Error("Unauthorized: Cross-church access denied.");
    }

    // Find the target user to notify/approve:
    // - intra_dept → target subunit's lead
    // - inter_dept → target dept's head
    let targetUserId: any = null;

    if (args.borrowType === "intra_dept" && args.targetSubunitId) {
      const targetSubunit = await ctx.db.get(args.targetSubunitId);
      if (!targetSubunit) throw new Error("Target subunit not found.");
      targetUserId = targetSubunit.leadId;
      if (!targetUserId) {
        throw new Error("Target subunit has no assigned lead. Please contact your Department Head.");
      }
    } else {
      // inter_dept — target the dept head
      targetUserId = targetDept.headId;
      if (!targetUserId) {
        throw new Error("Target department has no assigned head. Please contact a SuperAdmin.");
      }
    }

    const requestId = await ctx.db.insert("borrowRequests", {
      churchId: currentUser.churchId!,
      requestingUserId: currentUser._id,
      requestingDeptId: currentUser.departmentId!,
      requestingSubunitId: currentUser.subunitId,
      targetDeptId: args.targetDeptId,
      targetSubunitId: args.targetSubunitId,
      targetUserId,
      borrowType: args.borrowType,
      role: args.role,
      count: args.count,
      startDate: args.startDate,
      endDate: args.endDate,
      note: args.note,
      status: "pending",
    });

    const requestingDept = (await ctx.db.get(currentUser.departmentId!)) as any;
    const scopeLabel =
      args.borrowType === "intra_dept"
        ? "your subunit"
        : `${requestingDept?.name ?? "another"} Department`;

    await ctx.db.insert("notifications", {
      userId: targetUserId,
      title: "📋 Borrow Request Received",
      message: `${currentUser.name ?? "A team lead"} from ${scopeLabel} is requesting ${args.count} ${args.role}(s) from ${args.borrowType === "intra_dept" ? "your subunit" : "your department"} (${new Date(args.startDate).toLocaleDateString()} – ${new Date(args.endDate).toLocaleDateString()}).`,
      type: "borrow_request",
      read: false,
    });

    return requestId;
  },
});

/**
 * Approve a borrow request and nominate volunteers from your dept/subunit.
 * - inter_dept: only the target DeptHead (or SuperAdmin) can approve
 * - intra_dept: target SubunitLead (or DeptHead, or SuperAdmin) can approve
 */
export const approveBorrow = mutation({
  args: {
    requestId: v.id("borrowRequests"),
    volunteerIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found.");
    if (request.status !== "pending") throw new Error("This request is no longer pending.");

    // Auth: must be the target user, or a DeptHead of the target dept, or SuperAdmin
    const isSuperAdmin = currentUser.role === "SuperAdmin" || currentUser.role === "DeaconHead";
    const isTargetUser = currentUser._id === request.targetUserId;
    const isTargetDeptHead =
      (currentUser.role === "DepartmentHead" || currentUser.role === "DepartmentAssistant") &&
      currentUser.departmentId === request.targetDeptId;

    if (!isSuperAdmin && !isTargetUser && !isTargetDeptHead) {
      throw new Error("Unauthorized: You cannot approve this request.");
    }

    if (args.volunteerIds.length === 0) {
      throw new Error("You must nominate at least one volunteer.");
    }
    if (args.volunteerIds.length > request.count) {
      throw new Error(`You can nominate at most ${request.count} volunteer(s) for this request.`);
    }

    await ctx.db.patch(args.requestId, {
      status: "approved",
      volunteers: args.volunteerIds,
    });

    // Create pending assignment for each volunteer
    for (const vId of args.volunteerIds) {
      await ctx.db.insert("borrowAssignments", {
        userId: vId,
        requestId: args.requestId,
        churchId: currentUser.churchId!,
        targetDeptId: request.requestingDeptId,   // ← where they are going TO
        targetSubunitId: request.requestingSubunitId,
        startDate: request.startDate,
        endDate: request.endDate,
        status: "pending",
      });

      const requestingDept = await ctx.db.get(request.requestingDeptId);
      await ctx.db.insert("notifications", {
        userId: vId,
        title: "🤝 Borrow Assignment",
        message: `You've been nominated to help ${requestingDept?.name ?? "another team"} as a ${request.role} from ${new Date(request.startDate).toLocaleDateString()} to ${new Date(request.endDate).toLocaleDateString()}. Please accept or decline.`,
        type: "borrow_assignment_pending",
        read: false,
      });
    }

    // Notify the requester
    await ctx.db.insert("notifications", {
      userId: request.requestingUserId,
      title: "✅ Borrow Request Approved",
      message: `Your borrow request has been approved. ${args.volunteerIds.length} volunteer(s) have been nominated and are pending their confirmation.`,
      type: "borrow_request_approved",
      read: false,
    });
  },
});

/**
 * Decline a borrow request.
 * Only the target user, their dept head, or a SuperAdmin can decline.
 */
export const declineBorrow = mutation({
  args: {
    requestId: v.id("borrowRequests"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found.");
    if (request.status !== "pending") throw new Error("This request is no longer pending.");

    const isSuperAdmin = currentUser.role === "SuperAdmin" || currentUser.role === "DeaconHead";
    const isTargetUser = currentUser._id === request.targetUserId;
    const isTargetDeptHead =
      (currentUser.role === "DepartmentHead") &&
      currentUser.departmentId === request.targetDeptId;

    if (!isSuperAdmin && !isTargetUser && !isTargetDeptHead) {
      throw new Error("Unauthorized: You cannot decline this request.");
    }

    await ctx.db.patch(args.requestId, { status: "declined" });

    await ctx.db.insert("notifications", {
      userId: request.requestingUserId,
      title: "❌ Borrow Request Declined",
      message: args.reason
        ? `Your borrow request was declined. Reason: ${args.reason}`
        : "Your borrow request was declined by the other team lead.",
      type: "borrow_request_declined",
      read: false,
    });
  },
});

/**
 * Cancel a borrow request (by the requester, while still pending).
 */
export const cancelBorrowRequest = mutation({
  args: { requestId: v.id("borrowRequests") },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found.");
    if (request.requestingUserId !== currentUser._id && currentUser.role !== "SuperAdmin") {
      throw new Error("Unauthorized: Only the requester can cancel this request.");
    }
    if (request.status !== "pending") {
      throw new Error("Only pending requests can be cancelled.");
    }
    await ctx.db.patch(args.requestId, { status: "expired" });
  },
});

/**
 * Volunteer responds to their pending borrow assignment.
 */
export const respondToAssignment = mutation({
  args: {
    assignmentId: v.id("borrowAssignments"),
    accept: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment || assignment.userId !== currentUser._id) {
      throw new Error("Assignment not found or unauthorized.");
    }
    if (assignment.status !== "pending") {
      throw new Error("This assignment has already been responded to.");
    }

    const newStatus = args.accept ? "active" : "declined";
    await ctx.db.patch(args.assignmentId, { status: newStatus });

    if (args.accept) {
      await ctx.db.patch(currentUser._id, { isBorrowed: true });
    }

    const request = await ctx.db.get(assignment.requestId);
    if (request) {
      const targetDept = await ctx.db.get(assignment.targetDeptId);
      await ctx.db.insert("notifications", {
        userId: request.requestingUserId,
        title: args.accept ? "✅ Volunteer Accepted" : "❌ Volunteer Declined",
        message: args.accept
          ? `${currentUser.name ?? "A volunteer"} has accepted the borrow assignment to help ${targetDept?.name ?? "your team"}.`
          : `${currentUser.name ?? "A volunteer"} has declined the borrow assignment${args.reason ? `: ${args.reason}` : "."}`,
        type: args.accept ? "borrow_accepted" : "borrow_declined",
        read: false,
      });
    }
  },
});

/**
 * Auto-expire overdue assignments and requests. Called by a scheduled cron.
 */
export const autoExpire = mutation({
  handler: async (ctx) => {
    const now = Date.now();

    // Expire active assignments past endDate
    const activeAssignments = await ctx.db
      .query("borrowAssignments")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    for (const assignment of activeAssignments) {
      if (assignment.endDate < now) {
        await ctx.db.patch(assignment._id, { status: "expired" });
        await ctx.db.patch(assignment.userId, { isBorrowed: false });
        await ctx.db.insert("notifications", {
          userId: assignment.userId,
          title: "Borrow Period Ended",
          message: "Your temporary assignment has ended. You have returned to your original department.",
          type: "borrow_expired",
          read: false,
        });
      }
    }

    // Expire pending/approved requests past endDate
    const openRequests = await ctx.db
      .query("borrowRequests")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "approved")
        )
      )
      .collect();

    for (const request of openRequests) {
      if (request.endDate < now) {
        await ctx.db.patch(request._id, { status: "expired" });
      }
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/** Returns all non-expired borrow requests for the current church (SuperAdmin view). */
export const getActiveBorrowRequests = query({
  handler: async (ctx) => {
    const currentUser = await getAuthenticatedUser(ctx);
    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_church", (q) => q.eq("churchId", currentUser.churchId!))
      .filter((q) => q.neq(q.field("status"), "expired"))
      .collect();

    return await enrichRequests(ctx, requests, currentUser);
  },
});

/** Returns borrow requests incoming to the current user (they need to approve). */
export const getIncomingBorrowRequests = query({
  handler: async (ctx) => {
    const currentUser = await getAuthenticatedUser(ctx);
    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_target_user", (q) => q.eq("targetUserId", currentUser._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return await enrichRequests(ctx, requests, currentUser);
  },
});

/** Returns borrow requests sent by the current user. */
export const getOutgoingBorrowRequests = query({
  handler: async (ctx) => {
    const currentUser = await getAuthenticatedUser(ctx);
    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_requesting_dept", (q) => q.eq("requestingDeptId", currentUser.departmentId!))
      .filter((q) => q.neq(q.field("status"), "expired"))
      .collect();

    return await enrichRequests(ctx, requests, currentUser);
  },
});

/** Returns pending borrow assignments for the current user (they need to accept/decline). */
export const getMyBorrowAssignments = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const assignments = await ctx.db
      .query("borrowAssignments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return await Promise.all(
      assignments.map(async (a) => {
        const request = await ctx.db.get(a.requestId);
        const targetDept = await ctx.db.get(a.targetDeptId);
        const targetSubunit = a.targetSubunitId ? await ctx.db.get(a.targetSubunitId) : null;
        const requester = request ? await ctx.db.get(request.requestingUserId) : null;
        return {
          ...a,
          request,
          targetDept,
          targetSubunit,
          requester,
        };
      })
    );
  },
});

/** Returns volunteers available in a given dept/subunit for a borrow period (for the picker). */
export const getAvailableVolunteers = query({
  args: {
    deptId: v.id("departments"),
    subunitId: v.optional(v.id("subunits")),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    // Auth: only dept heads, subunit leads, or admins can view volunteers in a dept
    const canView =
      currentUser.role === "SuperAdmin" ||
      currentUser.role === "DeaconHead" ||
      currentUser.role === "PastoralOversight" ||
      currentUser.departmentId === args.deptId ||
      currentUser.subunitId === args.subunitId;

    if (!canView) throw new Error("Unauthorized.");

    let volunteers = await ctx.db
      .query("users")
      .withIndex("by_church", (q) => q.eq("churchId", currentUser.churchId!))
      .filter((q) => q.eq(q.field("departmentId"), args.deptId))
      .collect();

    // Filter to subunit if specified
    if (args.subunitId) {
      volunteers = volunteers.filter((u) => u.subunitId === args.subunitId);
    }

    // Filter out users already borrowed out during this period
    const activeAssignments = await ctx.db
      .query("borrowAssignments")
      .withIndex("by_church", (q) => q.eq("churchId", currentUser.churchId!))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const busyUserIds = new Set(
      activeAssignments
        .filter(
          (a) =>
            a.startDate <= args.endDate && a.endDate >= args.startDate
        )
        .map((a) => a.userId.toString())
    );

    return volunteers
      .filter((u) => !busyUserIds.has(u._id.toString()))
      .map((u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role }));
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function enrichRequests(ctx: any, requests: any[], currentUser: any) {
  return await Promise.all(
    requests.map(async (r) => {
      const requestingDept = await ctx.db.get(r.requestingDeptId);
      const targetDept = await ctx.db.get(r.targetDeptId);
      const targetSubunit = r.targetSubunitId ? await ctx.db.get(r.targetSubunitId) : null;
      const requestingSubunit = r.requestingSubunitId ? await ctx.db.get(r.requestingSubunitId) : null;
      const requester = await ctx.db.get(r.requestingUserId);
      return {
        ...r,
        requestingDeptName: requestingDept?.name ?? "Unknown",
        requestingSubunitName: requestingSubunit?.name ?? null,
        targetDeptName: targetDept?.name ?? "Unknown",
        targetSubunitName: targetSubunit?.name ?? null,
        requesterName: requester?.name ?? "Unknown",
      };
    })
  );
}
