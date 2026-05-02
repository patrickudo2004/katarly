import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

export const getChurchServices = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.churchId) return [];

    return await ctx.db
      .query("services")
      .withIndex("by_church_start_time", (q) => q.eq("churchId", user.churchId!))
      .order("desc")
      .collect();
  },
});

export const createService = mutation({
  args: {
    name: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    qrType: v.optional(v.union(v.literal("Unique"), v.literal("Generic"))),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user?.churchId) throw new Error("Church not found");

    const allowedRoles = ["SuperAdmin", "DeaconHead", "PastoralOversight"];
    if (!allowedRoles.includes(user.role)) {
      throw new Error("Unauthorized: Only SuperAdmin, DeaconHead, or PastoralOversight can create services.");
    }

    const church = await ctx.db.get(user.churchId);
    const resolvedQrType = args.qrType || church?.settings?.defaultQrType || "Unique";

    // Generate a secure secret for QR code
    const qrCodeSecret = Math.random().toString(36).substring(2, 15) + 
                         Math.random().toString(36).substring(2, 15);

    return await ctx.db.insert("services", {
      churchId: user.churchId,
      name: args.name,
      startTime: args.startTime,
      endTime: args.endTime,
      qrCodeSecret,
      qrType: resolvedQrType,
    });
  },
});

export const deleteService = mutation({
  args: { id: v.id("services") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (user?.role !== "SuperAdmin") throw new Error("Unauthorized");

    await ctx.db.delete(args.id);
  },
});

export const getDailyServices = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.churchId) return [];

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    return await ctx.db
      .query("services")
      .withIndex("by_church_start_time", (q) => 
        q.eq("churchId", user.churchId!).gte("startTime", startOfDay)
      )
      .filter((q) => q.lt(q.field("startTime"), endOfDay))
      .collect();
  },
});

export const getNextService = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user?.churchId) return null;

    const now = Date.now();
    const service = await ctx.db
      .query("services")
      .withIndex("by_church_start_time", (q) => 
        q.eq("churchId", user.churchId!).gte("startTime", now)
      )
      .first();

    return service;
  },
});
