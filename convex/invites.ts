import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";
import { auth } from "./auth";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

// Helper to check permissions
async function checkRole(ctx: QueryCtx | MutationCtx, requiredRoles: string[]) {
  const userId = await auth.getUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user || !user.role || !requiredRoles.includes(user.role)) {
    throw new Error("Insufficient permissions");
  }
  return user as Doc<"users">;
}

export const createInvite = mutation({
  args: {
    email: v.string(),
    role: v.string(),
    departmentId: v.optional(v.id("departments")),
    subunitId: v.optional(v.id("subunits")),
  },
  handler: async (ctx, args) => {
    const user = await checkRole(ctx, ["SuperAdmin", "DepartmentHead"]);
    if (!user.churchId) throw new Error("Inviter must belong to a church");
    
    const church = await ctx.db.get(user.churchId as Id<"churches">);
    
    const token = Math.random().toString(36).substring(2, 15);
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    const inviteId = await ctx.db.insert("invites", {
      email: args.email,
      churchId: user.churchId,
      invitedBy: user._id,
      role: args.role,
      departmentId: args.departmentId,
      subunitId: args.subunitId,
      token,
      expiresAt,
      status: "pending",
    });

    // Schedule the email sending action
    await ctx.scheduler.runAfter(0, api.invites.sendInviteEmail, {
      email: args.email,
      token: token,
      churchName: church?.name || "Katarly App",
    });

    return inviteId;
  },
});

export const bulkInvite = mutation({
  args: {
    emails: v.array(v.string()),
    role: v.string(),
    departmentId: v.optional(v.id("departments")),
    subunitId: v.optional(v.id("subunits")),
  },
  handler: async (ctx, args) => {
    const user = await checkRole(ctx, ["SuperAdmin", "DepartmentHead"]);
    if (!user.churchId) throw new Error("Inviter must belong to a church");
    
    const church = await ctx.db.get(user.churchId as Id<"churches">);

    for (const email of args.emails) {
      const token = Math.random().toString(36).substring(2, 15);
      await ctx.db.insert("invites", {
        email,
        churchId: user.churchId,
        invitedBy: user._id,
        role: args.role,
        departmentId: args.departmentId,
        subunitId: args.subunitId,
        token,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        status: "pending",
      });

      // Schedule the email sending action
      await ctx.scheduler.runAfter(0, api.invites.sendInviteEmail, {
        email,
        token,
        churchName: church?.name || "Katarly App",
      });
    }
  },
});

export const sendInviteEmail = action({
  args: {
    email: v.string(),
    token: v.string(),
    churchName: v.string(),
  },
  handler: async (ctx, args) => {
    // Environment Variable Audit
    const baseUrl = process.env.SITE_URL || process.env.VITE_CONVEX_SITE_URL || "https://katarly.vercel.app";
    const inviteLink = `${baseUrl}/accept-invite?token=${args.token}`;
    
    console.log(`[EmailAudit] Attempting to send invite to: ${args.email}`);
    console.log(`[EmailAudit] Using Base URL: ${baseUrl}`);
    console.log(`[EmailAudit] Service ID: ${process.env.EMAILJS_SERVICE_ID ? "PRESENT" : "MISSING"}`);
    console.log(`[EmailAudit] Template ID: ${process.env.EMAILJS_TEMPLATE_ID ? "PRESENT" : "MISSING"}`);

    const payload = {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      accessToken: process.env.EMAILJS_PRIVATE_KEY,
      template_params: {
        to_email: args.email,
        email: args.email, // Fallback variable name
        magic_link: inviteLink,
        church_name: args.churchName,
      }
    };

    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[EmailAudit] EmailJS API Error:", errorText);
      throw new Error(`Failed to send invite email: ${errorText}`);
    }
    
    console.log("[EmailAudit] Invite email successfully sent.");
  },
});

export const acceptInvite = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invite || invite.status !== "pending") throw new Error("Invalid or expired invite");
    if (invite.expiresAt < Date.now()) {
      await ctx.db.patch(invite._id, { status: "expired" });
      throw new Error("Invite has expired");
    }

    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Please sign in to accept invite");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    await ctx.db.patch(userId, {
      churchId: invite.churchId,
      role: invite.role as any,
      departmentId: invite.departmentId,
      subunitId: invite.subunitId,
    });

    await ctx.db.patch(invite._id, { status: "accepted" });

    return { churchId: invite.churchId };
  },
});

export const promoteUser = mutation({
  args: {
    userId: v.id("users"),
    newRole: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await checkRole(ctx, ["SuperAdmin", "DepartmentHead"]);
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("User not found");

    // Hierarchy check
    const roles = ["Volunteer", "SubunitLead", "DepartmentHead", "SuperAdmin"];
    if (roles.indexOf(admin.role) <= roles.indexOf(targetUser.role) && admin.role !== "SuperAdmin") {
      throw new Error("You cannot promote someone of equal or higher rank");
    }

    await ctx.db.patch(args.userId, { role: args.newRole as any });

    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: "Promotion!",
      message: `You have been promoted to ${args.newRole}`,
      type: "promotion",
      read: false,
    });
  },
});

export const revokeInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, args) => {
    await checkRole(ctx, ["SuperAdmin", "DepartmentHead"]);
    await ctx.db.delete(args.inviteId);
  },
});

export const resendInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, args) => {
    const user = await checkRole(ctx, ["SuperAdmin", "DepartmentHead"]);
    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite not found");
    
    const church = await ctx.db.get(user.churchId as Id<"churches">);
    
    // Refresh expiration date
    await ctx.db.patch(args.inviteId, {
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      status: "pending"
    });

    await ctx.scheduler.runAfter(0, api.invites.sendInviteEmail, {
      email: invite.email,
      token: invite.token,
      churchName: church?.name || "Katarly App",
    });
  },
});

export const getInvites = query({
  handler: async (ctx) => {
    const user = await checkRole(ctx, ["SuperAdmin", "DepartmentHead"]);
    const invites = await ctx.db
      .query("invites")
      .filter((q) => q.eq(q.field("churchId"), user.churchId))
      .collect();

    return Promise.all(invites.map(async (invite) => {
      const dept = invite.departmentId ? await ctx.db.get(invite.departmentId) : null;
      const sub = invite.subunitId ? await ctx.db.get(invite.subunitId) : null;
      return {
        ...invite,
        departmentName: dept?.name,
        subunitName: sub?.name,
      };
    }));
  },
});
