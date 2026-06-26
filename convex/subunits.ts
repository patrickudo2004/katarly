import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

export const getSubunits = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.churchId) return [];

    const subunits = await ctx.db
      .query("subunits")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId))
      .collect();

    // Map subunits to include department name for easier UI usage
    return Promise.all(subunits.map(async (s) => {
      const dept = await ctx.db.get(s.departmentId);
      return {
        ...s,
        departmentName: dept?.name || "Unknown Department",
      };
    }));
  },
});

export const getSubunit = query({
  args: { id: v.id("subunits") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const subunit = await ctx.db.get(args.id);
    if (!subunit || subunit.churchId !== user.churchId) return null;

    const dept = await ctx.db.get(subunit.departmentId);
    const lead = subunit.leadId ? await ctx.db.get(subunit.leadId) : null;
    const assistant = subunit.assistantId ? await ctx.db.get(subunit.assistantId) : null;

    return {
      ...subunit,
      departmentName: dept?.name || "Unknown",
      leadName: lead?.name || "None",
      assistantName: assistant?.name || "None",
    };
  },
});

export const createSubunit = mutation({
  args: {
    name: v.string(),
    departmentId: v.id("departments"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (user?.role !== "SuperAdmin") throw new Error("Unauthorized");

    const dept = await ctx.db.get(args.departmentId);
    if (!dept || dept.churchId !== user.churchId) {
      throw new Error("Unauthorized: Cross-church department reference blocked");
    }

    const subId = await ctx.db.insert("subunits", {
      churchId: user.churchId!,
      name: args.name,
      departmentId: args.departmentId,
    });

    await ctx.db.insert("channels", {
      churchId: user.churchId!,
      type: "subunit",
      departmentId: args.departmentId,
      subunitId: subId,
      name: `${args.name} Chat`,
      isDisabled: false,
    });

    return subId;
  },
});

export const updateSubunit = mutation({
  args: {
    id: v.id("subunits"),
    name: v.optional(v.string()),
    leadId: v.optional(v.union(v.id("users"), v.null())),
    assistantId: v.optional(v.union(v.id("users"), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    
    const subunit = await ctx.db.get(args.id);
    if (!subunit || subunit.churchId !== user?.churchId) throw new Error("Subunit not found");

    const isSuperAdmin = user?.role === "SuperAdmin";
    const isMyDept = user?.role === "DeaconHead" && user.departmentId === subunit.departmentId;

    if (!isSuperAdmin && !isMyDept) {
      throw new Error("Unauthorized to update subunit");
    }

    const { id, ...updates } = args;
    const patchUpdates: any = { ...updates };
    if (args.leadId === null) patchUpdates.leadId = undefined;
    if (args.assistantId === null) patchUpdates.assistantId = undefined;
    
    await ctx.db.patch(id, patchUpdates);
  },
});

export const deleteSubunit = mutation({
  args: { id: v.id("subunits") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (user?.role !== "SuperAdmin") throw new Error("Unauthorized");

    const subunit = await ctx.db.get(args.id);
    if (!subunit || subunit.churchId !== user.churchId) {
      throw new Error("Unauthorized: Cross-church deletion denied");
    }

    await ctx.db.delete(args.id);
  },
});

export const getLiveAttendance = query({
  args: {
    serviceId: v.optional(v.id("services")),
    subunitId: v.optional(v.id("subunits")),
  },
  handler: async (ctx, args) => {
    if (!args.serviceId || !args.subunitId) return [];
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user) return [];

    const service = await ctx.db.get(args.serviceId);
    const subunit = await ctx.db.get(args.subunitId);
    if (!service || !subunit) return [];
    if (service.churchId !== user.churchId || subunit.churchId !== user.churchId) return [];

    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId!))
      .collect();

    // Filter by subunit and fetch user details
    const results = [];
    for (const record of attendance) {
      const user = await ctx.db.get(record.userId);
      if (user?.subunitId === args.subunitId) {
        results.push({
          ...record,
          user,
        });
      }
    }

    return results;
  },
});



