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

export const assignOversight = mutation({
  args: {
    userId: v.id("users"),
    departmentId: v.id("departments"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "SuperAdmin") {
      throw new Error("Only SuperAdmins can assign Pastoral Oversight");
    }

    // Check if there's already an oversight for this department
    const existing = await ctx.db
      .query("users")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId!))
      .filter((q) => 
        q.and(
          q.eq(q.field("role"), "PastoralOversight"),
          q.eq(q.field("departmentId"), args.departmentId)
        )
      )
      .first();

    if (existing && existing._id !== args.userId) {
      const dept = await ctx.db.get(args.departmentId);
      throw new Error(`Department ${dept?.name || "this"} already has a Pastoral Oversight assigned.`);
    }

    await ctx.db.patch(args.userId, {
      role: "PastoralOversight",
      departmentId: args.departmentId,
    });
  },
});

export const escalateItem = mutation({
  args: {
    type: v.union(v.literal("probation"), v.literal("borrow"), v.literal("timeOff")),
    itemId: v.string(), // Generic ID string
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "PastoralOversight" && user.role !== "SuperAdmin") {
      throw new Error("Unauthorized to escalate items");
    }

    // In a real app, we'd update the specific item status or add an escalation record
    // For now, we'll send a notification to relevant parties
    const churchId = user.churchId!;
    
    // Notify SuperAdmin
    const superAdmin = await ctx.db
      .query("users")
      .withIndex("by_church", (q) => q.eq("churchId", churchId))
      .filter((q) => q.eq(q.field("role"), "SuperAdmin"))
      .first();

    if (superAdmin) {
      await ctx.db.insert("notifications", {
        userId: superAdmin._id,
        title: `Escalation: ${args.type.toUpperCase()}`,
        message: `Pastoral Oversight ${user.name} has escalated a ${args.type} item: ${args.note}`,
        type: "escalation",
        read: false,
      });
    }

    // If it's probation, we might extend it automatically
    if (args.type === "probation") {
      const probationId = ctx.db.normalizeId("probationPeriods", args.itemId);
      if (probationId) {
        const probation = await ctx.db.get(probationId);
        if (probation) {
          await ctx.db.patch(probationId, {
            status: "extended",
            endDate: probation.endDate + (30 * 24 * 60 * 60 * 1000), // Extend by 30 days
          });
        }
      }
    }
  },
});

export const postOversightMessage = mutation({
  args: {
    channelId: v.id("channels"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "PastoralOversight") {
      throw new Error("Only Pastoral Oversight can post oversight messages");
    }

    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    // Must be in their department
    if (channel.departmentId !== user.departmentId) {
      throw new Error("Unauthorized to post in this department's channels");
    }

    return await ctx.db.insert("messages", {
      channelId: args.channelId,
      userId: user._id,
      text: args.text,
      isPinned: true, // Oversight messages are pinned by default
      isOversight: true,
      createdAt: Date.now(),
    });
  },
});

export const getDepartmentHealth = query({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    
    const isSuperAdmin = user.role === "SuperAdmin";
    const isPastoral = user.role === "PastoralOversight" && user.departmentId === args.departmentId;
    const isDeptHead = (user.role === "DepartmentHead" || user.role === "DepartmentAssistant") && user.departmentId === args.departmentId;

    if (!isSuperAdmin && !isPastoral && !isDeptHead) {
      throw new Error("Unauthorized access to department health");
    }

    const churchId = user.churchId!;

    // 1. Attendance Average
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_church", (q) => q.eq("churchId", churchId))
      .collect();
    
    // Filter by department
    const deptUsers = await ctx.db
      .query("users")
      .withIndex("by_church", (q) => q.eq("churchId", churchId))
      .filter((q) => q.eq(q.field("departmentId"), args.departmentId))
      .collect();
    
    const deptUserIds = new Set(deptUsers.map(u => u._id));
    const deptAttendance = attendance.filter(a => deptUserIds.has(a.userId));
    
    const presentCount = deptAttendance.filter(a => a.status === "Present").length;
    const attendanceRate = deptAttendance.length > 0 ? (presentCount / deptAttendance.length) * 100 : 0;

    // 2. Probation Status
    const probations = await ctx.db
      .query("probationPeriods")
      .withIndex("by_user") // Simplified query
      .collect();
    
    const deptProbations = probations.filter(p => deptUserIds.has(p.userId));
    const activeProbations = deptProbations.filter(p => p.status === "active").length;
    const extendedProbations = deptProbations.filter(p => p.status === "extended").length;

    const borrowRequests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_church", (q) => q.eq("churchId", churchId))
      // For now we still use targetDept string in borrowRequests schema but we'll try to find a match
      // Ideally borrowRequests should also use departmentId
      .collect();
    
    const dept = await ctx.db.get(args.departmentId);
    const pendingBorrows = borrowRequests.filter(b => b.status === "pending" && b.targetDept === dept?.name).length;

    // 4. KPI Summary (Needs Improvement / Disapprove)
    const kpis = await ctx.db.query("kpiLogs").collect();
    const deptKpis = kpis.filter(k => deptUserIds.has(k.userId));
    const lowKpis = deptKpis.filter(k => k.score === "Needs Improvement" || k.score === "Disapprove").length;

    return {
      attendanceRate: Math.round(attendanceRate),
      activeProbations,
      extendedProbations,
      pendingBorrows,
      lowKpis,
      volunteerCount: deptUsers.length,
    };
  },
});
