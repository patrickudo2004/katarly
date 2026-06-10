import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

async function getAuthenticatedUser(ctx: any) {
  const userId = await auth.getUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  return user as any;
}

export const initializeProbation = mutation({
  args: {
    userId: v.id("users"),
    threshold: v.number(),
    months: v.number(),
    targetServiceCount: v.optional(v.number()),
    activeSubunitId: v.optional(v.id("subunits")),
    rotationSubunits: v.optional(v.array(v.id("subunits"))),
  },
  handler: async (ctx, args) => {
    const leadId = await auth.getUserId(ctx);
    if (!leadId) throw new Error("Not authenticated");
    const lead = await ctx.db.get(leadId);
    if (!lead || !["SuperAdmin", "DepartmentHead", "DeaconHead"].includes(lead.role || "")) {
      throw new Error("Unauthorized to set probation");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser || !targetUser.churchId) throw new Error("Target user not found");

    // Scoping check for DepartmentHead
    if (lead.role === "DepartmentHead" && targetUser.departmentId !== lead.departmentId) {
      throw new Error("Unauthorized: You can only place members of your department on probation");
    }

    const now = Date.now();
    const endDate = now + args.months * 30 * 24 * 60 * 60 * 1000;

    // 1. Patch the user record
    await ctx.db.patch(args.userId, {
      role: "Probation",
      subunitId: args.activeSubunitId || targetUser.subunitId,
      probationMetadata: {
        startDate: now,
        endDate,
        threshold: args.threshold,
        targetServiceCount: args.targetServiceCount,
        promotionStatus: "pending",
      }
    });

    // 2. Sync their membership role for the church
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_church", (q) => q.eq("userId", args.userId).eq("churchId", targetUser.churchId!))
      .unique();
    if (membership) {
      await ctx.db.patch(membership._id, {
        role: "Probation",
        subunitId: args.activeSubunitId || targetUser.subunitId,
      });
    }

    // 3. Close any previously active probation period
    const existingActive = await ctx.db
      .query("probationPeriods")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    for (const active of existingActive) {
      await ctx.db.patch(active._id, { status: "ended", endDate: now });
    }

    // 4. Insert dynamic probation tracking document atomically
    return await ctx.db.insert("probationPeriods", {
      userId: args.userId,
      churchId: targetUser.churchId,
      startDate: now,
      endDate,
      status: "active",
      createdBy: leadId,
      activeSubunitId: args.activeSubunitId,
      rotationSubunits: args.rotationSubunits,
    });
  },
});

export const addRemark = mutation({
  args: {
    userId: v.id("users"),
    content: v.string(), // Public comment
    privateNote: v.optional(v.string()), // Private comment for leaders
    sentiment: v.union(v.literal("Good"), v.literal("Fair"), v.literal("Concern")),
  },
  handler: async (ctx, args) => {
    const authorId = await auth.getUserId(ctx);
    if (!authorId) throw new Error("Not authenticated");
    const author = await ctx.db.get(authorId);
    if (!author || !["SuperAdmin", "DepartmentHead", "SubunitLead", "DeaconHead", "PastoralOversight"].includes(author.role || "")) {
      throw new Error("Unauthorized to add remarks");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    return await ctx.db.insert("probationRemarks", {
      userId: args.userId,
      authorId,
      churchId: user.churchId!,
      content: args.content,
      privateNote: args.privateNote,
      sentiment: args.sentiment,
      timestamp: Date.now(),
    });
  },
});

export const getProbationStatus = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.probationMetadata) return null;

    const currentUserId = await auth.getUserId(ctx);
    const currentUser = currentUserId ? await ctx.db.get(currentUserId) : null;
    const isLeader = currentUser && ["SuperAdmin", "DeaconHead", "PastoralOversight", "DepartmentHead", "SubunitLead"].includes(currentUser.role || "");

    const remarks = await ctx.db
      .query("probationRemarks")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    // Map remarks to filter out private fields if the viewer is the probationer themselves
    const remarksFiltered = remarks.map(r => {
      const { privateNote, ...publicFields } = r;
      return isLeader ? r : publicFields;
    });

    // Calculate current attendance for probation period
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .filter(q => q.gte(q.field("timestamp"), user.probationMetadata!.startDate))
      .collect();

    const stats = {
      present: attendance.filter(a => a.status === "Present").length,
      late: attendance.filter(a => a.status === "Late").length,
      total: attendance.length,
    };

    return {
      metadata: user.probationMetadata,
      remarks: remarksFiltered,
      stats,
    };
  },
});

export const listProbationers = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    
    let usersQuery = ctx.db
      .query("users")
      .withIndex("by_church", q => q.eq("churchId", args.churchId))
      .filter(q => q.eq(q.field("role"), "Probation"));

    // Scoped visibility
    if (user.role === "SuperAdmin" || user.role === "DeaconHead") {
      // Full view
    } else if (user.role === "DepartmentHead" || user.role === "DepartmentAssistant" || user.role === "DepartmentSecretary" || user.role === "PastoralOversight") {
      if (user.departmentId) {
        usersQuery = usersQuery.filter(q => q.eq(q.field("departmentId"), user.departmentId));
      } else {
        return [];
      }
    } else if (user.role === "SubunitLead" || user.role === "SubunitAssistant") {
      if (user.subunitId) {
        usersQuery = usersQuery.filter(q => q.eq(q.field("subunitId"), user.subunitId));
      } else {
        return [];
      }
    } else {
      return []; // Volunteers/Probationers see nothing
    }

    const users = await usersQuery.collect();

    return Promise.all(users.map(async (u) => {
      const remarks = await ctx.db
        .query("probationRemarks")
        .withIndex("by_user", q => q.eq("userId", u._id))
        .collect();

      const activePeriod = await ctx.db
        .query("probationPeriods")
        .withIndex("by_user", (q) => q.eq("userId", u._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .first();

      const dept = u.departmentId ? await ctx.db.get(u.departmentId) : null;
      const sub = u.subunitId ? await ctx.db.get(u.subunitId) : null;
      
      return {
        ...u,
        departmentName: dept?.name || "None",
        subunitName: sub?.name || "None",
        remarkCount: remarks.length,
        lastRemark: remarks[remarks.length - 1],
        activePeriod,
      };
    }));
  },
});

export const graduateProbationer = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("Volunteer"),
      v.literal("SubunitAssistant"),
      v.literal("SubunitLead"),
      v.literal("DepartmentAssistant"),
      v.literal("DepartmentHead")
    ),
  },
  handler: async (ctx, args) => {
    const leadId = await auth.getUserId(ctx);
    if (!leadId) throw new Error("Not authenticated");
    const lead = await ctx.db.get(leadId);
    if (!lead || !["SuperAdmin", "DepartmentHead", "DeaconHead"].includes(lead.role || "")) {
      throw new Error("Unauthorized to graduate user");
    }

    const user = await ctx.db.get(args.userId);
    if (!user || !user.churchId) throw new Error("User not found");

    if (lead.role === "DepartmentHead" && user.departmentId !== lead.departmentId) {
      throw new Error("Unauthorized: You can only graduate members of your own department");
    }

    // 1. Close active probation Period
    const activeProbation = await ctx.db
      .query("probationPeriods")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (activeProbation) {
      await ctx.db.patch(activeProbation._id, {
        status: "completed",
        endDate: Date.now(),
      });
    }

    // 2. Update user role and metadata
    await ctx.db.patch(args.userId, {
      role: args.role as any,
      probationMetadata: undefined,
    });

    // 3. Sync membership record
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_church", (q) => q.eq("userId", args.userId).eq("churchId", user.churchId!))
      .unique();
    if (membership) {
      await ctx.db.patch(membership._id, {
        role: args.role as any,
      });
    }

    // 4. Create congratulations notification
    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: "Growth Track Completed! 🎉",
      message: `Congratulations! You have completed your growth track and have been restored to full ${args.role} serving status.`,
      type: "promotion",
      read: false,
    });

    return { success: true };
  },
});

export const rotateProbationSubunit = mutation({
  args: {
    userId: v.id("users"),
    targetSubunitId: v.id("subunits"),
    targetDeptId: v.id("departments"),
  },
  handler: async (ctx, args) => {
    const leadId = await auth.getUserId(ctx);
    if (!leadId) throw new Error("Not authenticated");
    const lead = await ctx.db.get(leadId);
    if (!lead || !["SuperAdmin", "DepartmentHead", "DeaconHead"].includes(lead.role || "")) {
      throw new Error("Unauthorized to rotate subunit");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser || targetUser.churchId !== lead.churchId) {
      throw new Error("Target user not found");
    }

    if (lead.role === "DepartmentHead" && targetUser.departmentId !== lead.departmentId) {
      throw new Error("Unauthorized: You can only rotate members of your own department");
    }

    // Find active probation period
    const activeProbation = await ctx.db
      .query("probationPeriods")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!activeProbation) {
      throw new Error("User is not currently on an active probation period");
    }

    // 1. Update active subunit on probation period
    await ctx.db.patch(activeProbation._id, {
      activeSubunitId: args.targetSubunitId,
    });

    // 2. Update user document
    await ctx.db.patch(args.userId, {
      subunitId: args.targetSubunitId,
      departmentId: args.targetDeptId,
    });

    // 3. Sync membership
    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_church", (q) => q.eq("userId", args.userId).eq("churchId", lead.churchId!))
      .unique();
    if (membership) {
      await ctx.db.patch(membership._id, {
        subunitId: args.targetSubunitId,
        departmentId: args.targetDeptId,
      });
    }

    // 4. Log remark about rotation stage
    await ctx.db.insert("probationRemarks", {
      userId: args.userId,
      authorId: leadId,
      churchId: lead.churchId!,
      content: `Rotated to different subunit.`,
      privateNote: `Department Head rotated user to a different subunit in rotation track.`,
      sentiment: "Good",
      timestamp: Date.now(),
    });

    // 5. Send notification (Subunit Rotation Trigger)
    const subunit = await ctx.db.get(args.targetSubunitId);
    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: "Rotated to Different Subunit",
      message: `You have been rotated to serve in the ${subunit?.name || "new"} subunit. Keep up the great service!`,
      type: "rotation",
      read: false,
    });

    return { success: true };
  },
});

export const logKPIForUser = mutation({
  args: {
    userId: v.id("users"),
    score: v.union(v.literal("Excellent"), v.literal("Good"), v.literal("Needs Improvement"), v.literal("Disapprove")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const loggerId = await auth.getUserId(ctx);
    if (!loggerId) throw new Error("Not authenticated");
    const logger = await ctx.db.get(loggerId);
    if (!logger) throw new Error("Logger not found");

    const allowedRoles = ["SuperAdmin", "DepartmentHead", "SubunitLead"];
    if (!logger.role || !allowedRoles.includes(logger.role)) {
      throw new Error("Unauthorized: Only SuperAdmins, DepartmentHeads, and SubunitLeads can log KPIs.");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("Target user not found");

    if (logger.role === "DepartmentHead" && targetUser.departmentId !== logger.departmentId) {
      throw new Error("Unauthorized: You can only log KPIs for members in your department.");
    }
    if (logger.role === "SubunitLead" && targetUser.subunitId !== logger.subunitId) {
      throw new Error("Unauthorized: You can only log KPIs for members in your subunit.");
    }

    // Check if user is on probation
    const probation = await ctx.db
      .query("probationPeriods")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!probation) {
      throw new Error("User is not currently on an active probation period");
    }

    // Insert KPI log
    await ctx.db.insert("kpiLogs", {
      probationId: probation._id,
      userId: args.userId,
      loggerId,
      subunitId: probation.activeSubunitId,
      date: Date.now(),
      score: args.score,
      note: args.note,
    });

    // If score is Disapprove, automatically extend probation
    if (args.score === "Disapprove") {
      await ctx.db.patch(probation._id, {
        status: "extended",
        endDate: probation.endDate + (30 * 24 * 60 * 60 * 1000), // Extend by 30 days
      });
    }
  },
});

export const logKPI = mutation({
  args: {
    probationId: v.id("probationPeriods"),
    score: v.union(v.literal("Excellent"), v.literal("Good"), v.literal("Needs Improvement"), v.literal("Disapprove")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const loggerId = await auth.getUserId(ctx);
    if (!loggerId) throw new Error("Not authenticated");
    const logger = await ctx.db.get(loggerId);
    if (!logger) throw new Error("Logger not found");

    const probation = await ctx.db.get(args.probationId);
    if (!probation) throw new Error("Probation period not found");

    const allowedRoles = ["SuperAdmin", "DepartmentHead", "SubunitLead"];
    if (!logger.role || !allowedRoles.includes(logger.role)) {
      throw new Error("Unauthorized: Only SuperAdmins, DepartmentHeads, and SubunitLeads can log KPIs.");
    }

    const targetUser = await ctx.db.get(probation.userId);
    if (!targetUser) throw new Error("Target user not found");

    if (logger.role === "DepartmentHead" && targetUser.departmentId !== logger.departmentId) {
      throw new Error("Unauthorized: You can only log KPIs for members in your department.");
    }
    if (logger.role === "SubunitLead" && targetUser.subunitId !== logger.subunitId) {
      throw new Error("Unauthorized: You can only log KPIs for members in your subunit.");
    }

    await ctx.db.insert("kpiLogs", {
      probationId: args.probationId,
      userId: probation.userId,
      loggerId,
      subunitId: probation.activeSubunitId,
      date: Date.now(),
      score: args.score,
      note: args.note,
    });

    if (args.score === "Disapprove") {
      await ctx.db.patch(args.probationId, {
        status: "extended",
        endDate: probation.endDate + (30 * 24 * 60 * 60 * 1000),
      });
    }
  },
});

export const getProbationReport = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const probation = await ctx.db
      .query("probationPeriods")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (!probation) return null;

    const currentUserId = await auth.getUserId(ctx);
    const currentUser = currentUserId ? await ctx.db.get(currentUserId) : null;
    const isLeader = currentUser && ["SuperAdmin", "DeaconHead", "PastoralOversight", "DepartmentHead", "SubunitLead"].includes(currentUser.role || "");

    const logs = await ctx.db
      .query("kpiLogs")
      .withIndex("by_probation", (q) => q.eq("probationId", probation._id))
      .order("desc")
      .collect();

    // Map logs to append Subunit Names
    const logsMapped = await Promise.all(
      logs.map(async (log) => {
        const sub = log.subunitId ? await ctx.db.get(log.subunitId) : null;
        return {
          ...log,
          subunitName: sub?.name || "None",
        };
      })
    );

    // Get remarks
    const remarks = await ctx.db
      .query("probationRemarks")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const remarksFiltered = remarks.map(r => {
      const { privateNote, ...publicFields } = r;
      return isLeader ? r : publicFields;
    });

    // Calculate stats
    const scoreMap: Record<string, number> = {
      "Excellent": 4,
      "Good": 3,
      "Needs Improvement": 2,
      "Disapprove": 1,
    };

    const totalScore = logs.reduce((sum, log) => sum + (scoreMap[log.score] || 0), 0);
    const avgScore = logs.length > 0 ? totalScore / logs.length : 0;

    // Attendance rate since probation start
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("timestamp"), probation.startDate))
      .collect();

    const presentCount = attendance.filter(a => a.status === "Present").length;
    const attendanceRate = attendance.length > 0 ? presentCount / attendance.length : 0;

    return {
      probation,
      logs: logsMapped,
      remarks: remarksFiltered,
      stats: {
        attendanceRate,
        avgScore,
        totalLogs: logs.length,
      },
    };
  },
});
