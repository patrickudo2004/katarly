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
    if (!user) throw new Error("User not found");

    const allowedRoles = ["SuperAdmin", "DeaconHead", "PastoralOversight"];
    if (!allowedRoles.includes(user.role as string)) {
      throw new Error("Unauthorized: Only SuperAdmin, DeaconHead, or PastoralOversight can delete services.");
    }

    // Cascade delete rotas and their associated swap requests
    const rotas = await ctx.db
      .query("rotas")
      .withIndex("by_service", (q) => q.eq("serviceId", args.id))
      .collect();
    
    for (const rota of rotas) {
      const swaps = await ctx.db
        .query("swapRequests")
        .withIndex("by_rota", (q) => q.eq("rotaId", rota._id))
        .collect();
      for (const swap of swaps) {
        await ctx.db.delete(swap._id);
      }
      await ctx.db.delete(rota._id);
    }

    // Cascade delete attendance records
    const attendanceRecords = await ctx.db
      .query("attendance")
      .withIndex("by_service", (q) => q.eq("serviceId", args.id))
      .collect();
      
    for (const record of attendanceRecords) {
      await ctx.db.delete(record._id);
    }

    // Cascade delete verification requests
    const verificationReqs = await ctx.db
      .query("verificationRequests")
      .filter((q) => q.eq(q.field("serviceId"), args.id))
      .collect();
      
    for (const req of verificationReqs) {
      await ctx.db.delete(req._id);
    }

    // Finally, delete the service itself
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

export const getRecentServices = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.churchId) return [];

    return await ctx.db
      .query("services")
      .withIndex("by_church_start_time", (q) => q.eq("churchId", user.churchId!))
      .order("desc")
      .take(args.limit || 10);
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
