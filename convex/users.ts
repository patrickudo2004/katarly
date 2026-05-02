import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

export const me = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    image: v.optional(v.string()),
    availability: v.optional(v.any()),
    onboardingCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.patch(userId, args);
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const getAllChurchUsers = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.churchId) return [];

    const users = await ctx.db
      .query("users")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId!))
      .collect();

    return Promise.all(users.map(async (u) => {
      const dept = u.departmentId ? await ctx.db.get(u.departmentId) : null;
      const sub = u.subunitId ? await ctx.db.get(u.subunitId) : null;
      return {
        ...u,
        departmentName: dept?.name || "None",
        subunitName: sub?.name || "None",
      };
    }));
  },
});

export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("Volunteer"),
      v.literal("SubunitAssistant"),
      v.literal("SubunitLead"),
      v.literal("DepartmentAssistant"),
      v.literal("DepartmentHead"),
      v.literal("PastoralOversight"),
      v.literal("DeaconHead"),
      v.literal("SuperAdmin")
    ),
    departmentId: v.optional(v.id("departments")),
    subunitId: v.optional(v.id("subunits")),
  },
  handler: async (ctx, args) => {
    const adminId = await auth.getUserId(ctx);
    if (!adminId) throw new Error("Not authenticated");
    const admin = await ctx.db.get(adminId);

    const isSuperAdmin = admin?.role === "SuperAdmin";
    const isDeaconHead = admin?.role === "DeaconHead";

    if (!isSuperAdmin && !isDeaconHead) {
      throw new Error("Only SuperAdmin or DeaconHead can change roles");
    }

    // DeaconHead can only assign PastoralOversight, and only within their own department
    if (isDeaconHead) {
      if (args.role !== "PastoralOversight") {
        throw new Error("DeaconHead can only assign the PastoralOversight role");
      }
      const targetUser = await ctx.db.get(args.userId);
      if (targetUser?.departmentId !== admin?.departmentId) {
        throw new Error("DeaconHead can only assign roles within their own department");
      }
    }

    // Only SuperAdmin can assign DeaconHead
    if (args.role === "DeaconHead" && !isSuperAdmin) {
      throw new Error("Only SuperAdmin can assign the DeaconHead role");
    }

    const { userId, ...updates } = args;
    await ctx.db.patch(userId, updates);
  },
});
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    if (user.role === "SuperAdmin" && user.churchId) {
      // Check if there are other SuperAdmins in this church
      const otherSuperAdmins = await ctx.db
        .query("users")
        .withIndex("by_church", (q) => q.eq("churchId", user.churchId!))
        .filter((q) => q.and(
          q.eq(q.field("role"), "SuperAdmin"),
          q.neq(q.field("_id"), userId)
        ))
        .collect();

      if (otherSuperAdmins.length === 0) {
        throw new Error("You are the only SuperAdmin. Please promote someone else before deleting your account.");
      }
    }

    // Delete the user record
    await ctx.db.delete(userId);
    
    // Note: In a production app, we might also want to clean up:
    // - Sessions (handled by Convex Auth usually)
    // - Notifications
    // - Time off requests
    // - Rota assignments (might want to set them to unassigned instead of deleting)
  },
});
