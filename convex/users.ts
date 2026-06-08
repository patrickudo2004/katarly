import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

async function resolveImageUrl(ctx: any, image: string | undefined) {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  try {
    return await ctx.storage.getUrl(image);
  } catch (e) {
    return null;
  }
}

export const me = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    
    const dept = user.departmentId ? await ctx.db.get(user.departmentId) : null;
    const sub = user.subunitId ? await ctx.db.get(user.subunitId) : null;
    const church = user.churchId ? await ctx.db.get(user.churchId) : null;

    return {
      ...user,
      departmentName: dept?.name || "None",
      subunitName: sub?.name || "None",
      churchName: church?.name || "Katarly",
      imageUrl: await resolveImageUrl(ctx, user.image),
    };
  },
});

export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      ...user,
      imageUrl: await resolveImageUrl(ctx, user.image),
    };
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

export const getMyMemberships = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return Promise.all(
      memberships.map(async (m) => {
        const church = await ctx.db.get(m.churchId);
        return {
          ...m,
          churchName: church?.name || "Unknown Church",
          churchLogoUrl: church ? await resolveImageUrl(ctx, church.logoUrl) : null,
          churchSlug: church?.slug || "",
        };
      })
    );
  },
});

export const switchActiveChurch = mutation({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_church", (q) => q.eq("userId", userId).eq("churchId", args.churchId))
      .unique();

    if (!membership) throw new Error("You do not belong to this church");

    await ctx.db.patch(userId, {
      churchId: membership.churchId,
      role: membership.role as any,
      departmentId: membership.departmentId,
      subunitId: membership.subunitId,
      onboardingCompleted: membership.onboardingCompleted ?? false,
    });

    return { success: true };
  },
});

export const syncLegacyMembership = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user || !user.churchId) return { success: false };

    const existing = await ctx.db
      .query("memberships")
      .withIndex("by_user_church", (q) => q.eq("userId", userId).eq("churchId", user.churchId!))
      .unique();

    if (!existing) {
      await ctx.db.insert("memberships", {
        userId,
        churchId: user.churchId,
        role: user.role || "Volunteer",
        departmentId: user.departmentId,
        subunitId: user.subunitId,
        onboardingCompleted: user.onboardingCompleted ?? false,
      });
      return { success: true, synced: true };
    }

    return { success: true, synced: false };
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const getAllChurchUsers = query({
  args: {
    searchTerm: v.optional(v.string()),
    roleFilter: v.optional(v.string()),
    statusFilter: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    sortBy: v.optional(v.union(v.literal("name"), v.literal("dateJoined"), v.literal("role"))),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.churchId) return [];

    let usersQuery = ctx.db
      .query("users")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId!));

    // 1. Status Filter (Default to active)
    const status = args.statusFilter || "active";
    if (status === "active") {
      // Treat both "active" and undefined as active for backward compatibility
      usersQuery = usersQuery.filter((q) => 
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), undefined)
        )
      );
    } else {
      usersQuery = usersQuery.filter((q) => q.eq(q.field("status"), status));
    }

    // Role-based scoping
    if (user.role === "SuperAdmin") {
      // Sees everyone
    } else if (user.role === "DeaconHead" || user.role === "DepartmentHead" || user.role === "DepartmentAssistant" || user.role === "DepartmentSecretary" || user.role === "PastoralOversight") {
      if (user.departmentId) {
        usersQuery = usersQuery.filter((q) => q.eq(q.field("departmentId"), user.departmentId));
      } else {
        return [];
      }
    } else if (user.role === "SubunitLead" || user.role === "SubunitAssistant") {
      if (user.subunitId) {
        usersQuery = usersQuery.filter((q) => q.eq(q.field("subunitId"), user.subunitId));
      } else {
        return [];
      }
    } else {
      return [];
    }

    let users = await usersQuery.collect();

    // 2. Search Filter
    if (args.searchTerm) {
      const search = args.searchTerm.toLowerCase();
      users = users.filter(u => 
        (u.name?.toLowerCase() || "").includes(search) || 
        (u.email?.toLowerCase() || "").includes(search)
      );
    }

    // 3. Role Filter
    if (args.roleFilter && args.roleFilter !== "All") {
      users = users.filter(u => u.role === args.roleFilter);
    }

    // 4. Sorting
    const sortBy = args.sortBy || "name";
    const order = args.sortOrder || "asc";

    users.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      if (sortBy === "name") {
        valA = a.name || a.email || "";
        valB = b.name || b.email || "";
      } else if (sortBy === "dateJoined") {
        valA = a._creationTime;
        valB = b._creationTime;
      } else if (sortBy === "role") {
        valA = a.role || "";
        valB = b.role || "";
      }

      if (valA < valB) return order === "asc" ? -1 : 1;
      if (valA > valB) return order === "asc" ? 1 : -1;
      return 0;
    });

    return Promise.all(users.map(async (u) => {
      const dept = u.departmentId ? await ctx.db.get(u.departmentId) : null;
      const sub = u.subunitId ? await ctx.db.get(u.subunitId) : null;
      return {
        ...u,
        departmentName: dept?.name || "None",
        subunitName: sub?.name || "None",
        imageUrl: await resolveImageUrl(ctx, u.image),
      };
    }));
  },
});

export const getVisibleUsers = getAllChurchUsers;

export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("Volunteer"),
      v.literal("Probation"),
      v.literal("SubunitAssistant"),
      v.literal("SubunitLead"),
      v.literal("DepartmentAssistant"),
      v.literal("DepartmentHead"),
      v.literal("DepartmentSecretary"),
      v.literal("PastoralOversight"),
      v.literal("DeaconHead"),
      v.literal("SuperAdmin")
    ),
    departmentId: v.optional(v.id("departments")),
    subunitId: v.optional(v.id("subunits")),
    skills: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const adminId = await auth.getUserId(ctx);
    if (!adminId) throw new Error("Not authenticated");
    const admin = await ctx.db.get(adminId);
    if (!admin) throw new Error("Admin user not found");

    const isSuperAdmin = admin.role === "SuperAdmin";
    const isDeaconHead = admin.role === "DeaconHead";

    if (!isSuperAdmin && !isDeaconHead) {
      throw new Error("Only SuperAdmin or DeaconHead can change roles");
    }

    // DeaconHead can only assign PastoralOversight, and only within their own department
    if (isDeaconHead) {
      if (args.role !== "PastoralOversight") {
        throw new Error("DeaconHead can only assign the PastoralOversight role");
      }
      const targetUser = await ctx.db.get(args.userId);
      if (targetUser?.departmentId !== admin.departmentId) {
        throw new Error("DeaconHead can only assign roles within their own department");
      }
    }

    // Only SuperAdmin can assign DeaconHead or move across depts
    if (args.role === "DeaconHead" && !isSuperAdmin) {
      throw new Error("Only SuperAdmin can assign the DeaconHead role");
    }

    const { userId, skills, ...updates } = args;
    const churchId = admin.churchId!;

    let membership = await ctx.db
      .query("memberships")
      .withIndex("by_user_church", (q) => q.eq("userId", userId).eq("churchId", churchId))
      .unique();

    if (membership) {
      await ctx.db.patch(membership._id, {
        role: args.role as any,
        departmentId: args.departmentId,
        subunitId: args.subunitId,
      });
    } else {
      await ctx.db.insert("memberships", {
        userId,
        churchId,
        role: args.role as any,
        departmentId: args.departmentId,
        subunitId: args.subunitId,
        onboardingCompleted: true,
      });
    }

    const targetUser = await ctx.db.get(userId);
    if (targetUser && targetUser.churchId === churchId) {
      const userPatch: any = {
        role: args.role as any,
        departmentId: args.departmentId,
        subunitId: args.subunitId,
      };
      if (skills !== undefined) {
        userPatch.skills = skills;
      }
      await ctx.db.patch(userId, userPatch);
    }
  },
});

export const archiveUser = mutation({
  args: { userId: v.id("users"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const adminId = await auth.getUserId(ctx);
    if (!adminId) throw new Error("Not authenticated");
    const admin = await ctx.db.get(adminId);

    if (admin?.role !== "SuperAdmin" && admin?.role !== "DeaconHead") {
      throw new Error("Unauthorized to archive users");
    }

    await ctx.db.patch(args.userId, {
      status: "archived",
      statusMetadata: {
        archivedAt: Date.now(),
        archivedBy: adminId,
        reason: args.reason,
      }
    });

    // Note: In Phase 2, we should also cancel their future rotas here
  },
});

export const unarchiveUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const adminId = await auth.getUserId(ctx);
    if (!adminId) throw new Error("Not authenticated");
    const admin = await ctx.db.get(adminId);

    if (admin?.role !== "SuperAdmin") {
      throw new Error("Only SuperAdmins can unarchive users");
    }

    await ctx.db.patch(args.userId, {
      status: "active",
    });
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

    await ctx.db.delete(userId);
  },
});
