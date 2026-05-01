import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const createRotaEntry = mutation({
  args: {
    serviceId: v.id("services"),
    subunitId: v.id("subunits"),
    userId: v.id("users"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user?.churchId) throw new Error("User has no church");

    return await ctx.db.insert("rotas", {
      serviceId: args.serviceId,
      subunitId: args.subunitId,
      userId: args.userId,
      role: args.role,
      status: "Pending",
    });
  },
});

export const removeRotaEntry = mutation({
  args: { rotaId: v.id("rotas") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    const entry = await ctx.db.get(args.rotaId);

    // Auth: Only Leads or Admins can remove
    if (user?.role === "Volunteer") throw new Error("Unauthorized");

    await ctx.db.delete(args.rotaId);
  },
});

export const getRotaForRange = query({
  args: {
    startDate: v.number(), // Timestamp of start of week
    endDate: v.number(),   // Timestamp of end of week
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.churchId) return [];

    // 1. Get all services in the range for this church
    const services = await ctx.db
      .query("services")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId))
      .filter((q) => q.and(
        q.gte(q.field("startTime"), args.startDate),
        q.lte(q.field("startTime"), args.endDate)
      ))
      .collect();

    const serviceIds = services.map(s => s._id);

    // 2. Get all rota entries for these services
    const results = [];
    for (const serviceId of serviceIds) {
      const entries = await ctx.db
        .query("rotas")
        .withIndex("by_service", (q) => q.eq("serviceId", serviceId))
        .collect();

      const serviceDetail = services.find(s => s._id === serviceId);

      for (const entry of entries) {
        const attendee = await ctx.db.get(entry.userId);
        const subunit = await ctx.db.get(entry.subunitId);
        results.push({
          ...entry,
          userName: attendee?.name || attendee?.email || "Unknown",
          userRole: attendee?.role || "Volunteer",
          position: entry.role,
          date: serviceDetail?.startTime,
          serviceName: serviceDetail?.name,
          subunitName: subunit?.name,
        });
      }
    }

    return results;
  },
});

export const getCoverageStats = query({
  args: {
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.churchId) return [];

    const startOfYear = new Date(args.year, 0, 1).getTime();
    const endOfYear = new Date(args.year, 11, 31, 23, 59, 59, 999).getTime();

    // 1. Get all services for the year
    const services = await ctx.db
      .query("services")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId))
      .filter((q) => q.and(
        q.gte(q.field("startTime"), startOfYear),
        q.lte(q.field("startTime"), endOfYear)
      ))
      .collect();

    // 2. For each service, count rotas
    const stats = await Promise.all(services.map(async (s) => {
      const entries = await ctx.db
        .query("rotas")
        .withIndex("by_service", (q) => q.eq("serviceId", s._id))
        .collect();

      return {
        date: s.startTime,
        serviceId: s._id,
        filled: entries.length,
        // Mock requirement: 3+ for full coverage for now
        status: entries.length === 0 ? 'empty' : entries.length < 3 ? 'partial' : 'full'
      };
    }));

    return stats;
  },
});

export const getServiceRota = query({
  args: { serviceId: v.id("services") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("rotas")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .collect();

    return await Promise.all(entries.map(async (e) => {
      const user = await ctx.db.get(e.userId);
      return { ...e, userName: user?.name, userEmail: user?.email };
    }));
  },
});

export const getMyShifts = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const shifts = await ctx.db
      .query("rotas")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Join with service details
    return await Promise.all(
      shifts.map(async (shift) => {
        const service = await ctx.db.get(shift.serviceId);
        const subunit = await ctx.db.get(shift.subunitId);
        return { ...shift, service, subunit };
      })
    );
  },
});
