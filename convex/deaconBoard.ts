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

// Get the full governance dashboard for a DeaconHead
export const getDeaconDashboard = query({
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    // Allowed for DeaconHead and SuperAdmin
    if (user.role !== "DeaconHead" && user.role !== "SuperAdmin") {
      throw new Error("Unauthorized: Access restricted to Deacon Heads and Super Admins");
    }
    const churchId = user.churchId!;

    // Church-wide stats
    const allUsers = await ctx.db
      .query("users")
      .withIndex("by_church", (q) => q.eq("churchId", churchId))
      .collect();

    const allServices = await ctx.db
      .query("services")
      .withIndex("by_church_start_time", (q) => q.eq("churchId", churchId))
      .order("desc")
      .take(5);

    let totalRate = 0;
    for (const service of allServices) {
      const attended = await ctx.db
        .query("attendance")
        .withIndex("by_service", (q) => q.eq("serviceId", service._id))
        .filter((q) => q.eq(q.field("status"), "Present"))
        .collect();
      const rate = allUsers.length > 0 ? (attended.length / allUsers.length) * 100 : 0;
      totalRate += rate;
    }
    const avgAttendance = allServices.length > 0 ? Math.round(totalRate / allServices.length) : 0;

    // Active probations
    const probations = await ctx.db
      .query("probationPeriods")
      .withIndex("by_church", (q) => q.eq("churchId", churchId))
      .collect();
    const activeProbations = probations.filter(
      (p) => p.status === "active" || p.status === "extended"
    ).length;

    // Pending escalations (swap requests & time-off requests pending)
    const pendingSwaps = await ctx.db
      .query("swapRequests")
      .withIndex("by_church_status", (q) =>
        q.eq("churchId", churchId).eq("status", "available")
      )
      .collect();

    const pendingTimeOff = await ctx.db
      .query("timeOffRequests")
      .withIndex("by_church_status", (q) =>
        q.eq("churchId", churchId).eq("status", "Pending")
      )
      .collect();

    // New formal escalations
    const formalEscalations = await ctx.db
      .query("escalations")
      .withIndex("by_church_status", (q) => 
        q.eq("churchId", churchId).eq("status", "pending")
      )
      .collect();

    // Department stats
    const departments = await ctx.db
      .query("departments")
      .withIndex("by_church", (q) => q.eq("churchId", churchId))
      .collect();

    return {
      totalVolunteers: allUsers.length,
      avgAttendance,
      activeProbations,
      pendingEscalations: pendingSwaps.length + pendingTimeOff.length + formalEscalations.length,
      formalEscalationsCount: formalEscalations.length,
      departmentCount: departments.length,
    };
  },
});

// Approve or decline an escalation
export const resolveEscalation = mutation({
  args: {
    escalationId: v.id("escalations"),
    action: v.union(v.literal("approved"), v.literal("declined")),
    resolutionNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "DeaconHead" && user.role !== "SuperAdmin") {
      throw new Error("Unauthorized to resolve escalations");
    }

    const escalation = await ctx.db.get(args.escalationId);
    if (!escalation) throw new Error("Escalation not found");

    await ctx.db.patch(args.escalationId, {
      status: args.action,
      resolvedBy: user._id,
      resolvedAt: Date.now(),
    });

    // If it's a probation escalation, update the original record
    if (escalation.type === "probation" && escalation.itemId) {
      const probationId = ctx.db.normalizeId("probationPeriods", escalation.itemId);
      if (probationId) {
        await ctx.db.patch(probationId, {
          status: args.action === "approved" ? "extended" : "active",
        });
      }
    }

    // Notify initiator
    await ctx.db.insert("notifications", {
      userId: escalation.initiatorId,
      title: `Escalation Resolved: ${args.action.toUpperCase()}`,
      message: `Your escalation regarding ${escalation.type} has been ${args.action}. ${args.resolutionNote || ""}`,
      type: "escalation_resolved",
      read: false,
    });
  },
});

// Legacy approveEscalation kept for compatibility during transition
export const approveEscalation = mutation({
  args: {
    type: v.union(v.literal("swap"), v.literal("timeOff")),
    itemId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "DeaconHead" && user.role !== "SuperAdmin") {
      throw new Error("Unauthorized to approve escalations");
    }

    if (args.type === "swap") {
      const swapId = ctx.db.normalizeId("swapRequests", args.itemId);
      if (!swapId) throw new Error("Invalid swap request ID");
      await ctx.db.patch(swapId, { status: "approved" });
    } else {
      const timeOffId = ctx.db.normalizeId("timeOffRequests", args.itemId);
      if (!timeOffId) throw new Error("Invalid time-off request ID");
      await ctx.db.patch(timeOffId, {
        status: "Approved",
        reviewedBy: user._id,
        reviewedAt: Date.now(),
      });
    }
  },
});

// Post a board-level announcement to the Deacon Board channel
export const postBoardAnnouncement = mutation({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "DeaconHead" && user.role !== "SuperAdmin") {
      throw new Error("Only Deacon Heads can post board announcements");
    }

    const churchId = user.churchId!;

    // Find or create the deaconBoard channel
    let channel = await ctx.db
      .query("channels")
      .withIndex("by_church", (q) => q.eq("churchId", churchId))
      .filter((q) => q.eq(q.field("type"), "deaconBoard"))
      .first();

    if (!channel) {
      const channelId = await ctx.db.insert("channels", {
        churchId,
        type: "deaconBoard",
        name: "Deacon Board",
        isDisabled: false,
      });
      channel = await ctx.db.get(channelId);
    }

    return await ctx.db.insert("messages", {
      channelId: channel!._id,
      userId: user._id,
      text: args.text,
      isPinned: true, // Board messages always pinned
      isOversight: false,
      createdAt: Date.now(),
    });
  },
});

// Ensure the Deacon Board channel exists for a church
export const ensureDeaconChannel = mutation({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "SuperAdmin" && user.role !== "DeaconHead") {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("channels")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.eq(q.field("type"), "deaconBoard"))
      .first();

    if (!existing) {
      await ctx.db.insert("channels", {
        churchId: args.churchId,
        type: "deaconBoard",
        name: "Deacon Board",
        isDisabled: false,
      });
    }
  },
});

// Get the pending escalations for the manager component
export const getPendingEscalations = query({
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "DeaconHead" && user.role !== "SuperAdmin") return [];

    const escalations = await ctx.db
      .query("escalations")
      .withIndex("by_church_status", (q) => 
        q.eq("churchId", user.churchId!).eq("status", "pending")
      )
      .collect();

    return await Promise.all(
      escalations.map(async (esc) => {
        const initiator = await ctx.db.get(esc.initiatorId);
        return {
          ...esc,
          initiatorName: initiator?.name || "Unknown",
        };
      })
    );
  },
});

// Get the messages in the Deacon Board channel
export const getDeaconBoardMessages = query({
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    // Allowed for DeaconHead and SuperAdmin
    if (user.role !== "DeaconHead" && user.role !== "SuperAdmin") {
      throw new Error("Access to Deacon Board channel is restricted to Deacon Heads and Super Admins");
    }

    const channel = await ctx.db
      .query("channels")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId!))
      .filter((q) => q.eq(q.field("type"), "deaconBoard"))
      .first();

    if (!channel) return [];

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", channel._id))
      .order("desc")
      .take(50);

    const withAuthors = await Promise.all(
      messages.map(async (msg) => {
        const author = await ctx.db.get(msg.userId);
        return {
          ...msg,
          author: {
            name: author?.name || "Unknown",
            role: author?.role || "DeaconHead",
          },
        };
      })
    );

    return withAuthors.reverse();
  },
});
