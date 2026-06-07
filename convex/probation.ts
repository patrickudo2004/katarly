import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const initializeProbation = mutation({
  args: {
    userId: v.id("users"),
    threshold: v.number(),
    months: v.number(),
    targetServiceCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const leadId = await auth.getUserId(ctx);
    if (!leadId) throw new Error("Not authenticated");
    const lead = await ctx.db.get(leadId);
    if (!lead || !["SuperAdmin", "DepartmentHead", "DeaconHead"].includes(lead.role)) {
      throw new Error("Unauthorized to set probation");
    }

    const now = Date.now();
    const endDate = now + args.months * 30 * 24 * 60 * 60 * 1000;

    await ctx.db.patch(args.userId, {
      role: "Probation",
      probationMetadata: {
        startDate: now,
        endDate,
        threshold: args.threshold,
        targetServiceCount: args.targetServiceCount,
        promotionStatus: "pending",
      }
    });
  },
});

export const addRemark = mutation({
  args: {
    userId: v.id("users"),
    content: v.string(),
    sentiment: v.union(v.literal("Good"), v.literal("Fair"), v.literal("Concern")),
  },
  handler: async (ctx, args) => {
    const authorId = await auth.getUserId(ctx);
    if (!authorId) throw new Error("Not authenticated");
    const author = await ctx.db.get(authorId);
    if (!author || !["SuperAdmin", "DepartmentHead", "SubunitLead", "DeaconHead", "PastoralOversight"].includes(author.role)) {
      throw new Error("Unauthorized to add remarks");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    return await ctx.db.insert("probationRemarks", {
      userId: args.userId,
      authorId,
      churchId: user.churchId,
      content: args.content,
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

    const remarks = await ctx.db
      .query("probationRemarks")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .order("desc")
      .collect();

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
      remarks,
      stats,
    };
  },
});

export const listProbationers = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const users = await ctx.db
      .query("users")
      .withIndex("by_church", q => q.eq("churchId", args.churchId))
      .filter(q => q.eq(q.field("role"), "Probation"))
      .collect();

    return Promise.all(users.map(async (u) => {
      const remarks = await ctx.db
        .query("probationRemarks")
        .withIndex("by_user", q => q.eq("userId", u._id))
        .collect();
      
      return {
        ...u,
        remarkCount: remarks.length,
        lastRemark: remarks[remarks.length - 1],
      };
    }));
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
      .filter((q) => q.neq(q.field("status"), "ended"))
      .first();

    if (!probation) return null;

    const logs = await ctx.db
      .query("kpiLogs")
      .withIndex("by_probation", (q) => q.eq("probationId", probation._id))
      .order("desc")
      .collect();

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
      logs,
      stats: {
        attendanceRate,
        avgScore,
        totalLogs: logs.length,
      },
    };
  },
});
