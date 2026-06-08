import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

async function checkAdmin(ctx: any) {
  const userId = await auth.getUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user?.role !== "SuperAdmin") throw new Error("Unauthorized");
  return user;
}

export const createDepartment = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await checkAdmin(ctx);
    return await ctx.db.insert("departments", {
      churchId: user.churchId!,
      name: args.name,
    });
  },
});

export const getDepartments = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.churchId) return [];

    return await ctx.db
      .query("departments")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId))
      .collect();
  },
});

export const deleteDepartment = mutation({
  args: { id: v.id("departments") },
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    
    // Check if any subunits are using this department
    const subunits = await ctx.db
      .query("subunits")
      .withIndex("by_department", (q) => q.eq("departmentId", args.id))
      .collect();
    
    if (subunits.length > 0) {
      throw new Error("Cannot delete department with active subunits");
    }

    await ctx.db.delete(args.id);
  },
});

export const updateDepartmentHeads = mutation({
  args: {
    id: v.id("departments"),
    headId: v.optional(v.union(v.id("users"), v.null())),
    assistantId: v.optional(v.union(v.id("users"), v.null())),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    
    const isSuperAdmin = user?.role === "SuperAdmin";
    const isMyDept = user?.role === "DeaconHead" && user.departmentId === args.id;

    if (!isSuperAdmin && !isMyDept) {
      throw new Error("Unauthorized to update department heads");
    }

    const updates: any = {};
    if (args.headId !== undefined) updates.headId = args.headId === null ? undefined : args.headId;
    if (args.assistantId !== undefined) updates.assistantId = args.assistantId === null ? undefined : args.assistantId;

    await ctx.db.patch(args.id, updates);
  },
});

export const updateDepartment = mutation({
  args: {
    id: v.id("departments"),
    name: v.string(),
    requiresSafeguarding: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await checkAdmin(ctx);
    await ctx.db.patch(args.id, { 
      name: args.name,
      requiresSafeguarding: args.requiresSafeguarding,
    });
  },
});
