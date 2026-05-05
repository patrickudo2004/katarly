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
