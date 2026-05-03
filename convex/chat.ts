import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

async function getAuthenticatedUser(ctx: any) {
  const userId = await auth.getUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  return user;
}

export const getChannels = query({
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user.churchId) return [];

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId!))
      .collect();

    // Filter based on permissions
    return channels.filter((channel) => {
      // Deacon Board channel: only DeaconHead can access (SuperAdmin excluded unless also DeaconHead)
      if (channel.type === "deaconBoard") {
        return user.role === "DeaconHead";
      }
      if (channel.type === "announcement") return true;
      if (user.role === "SuperAdmin") return true;
      
      if (channel.type === "department") {
        return channel.departmentId === user.departmentId;
      }
      
      if (channel.type === "subunit") {
        return (
          channel.departmentId === user.departmentId &&
          (channel.subunitId === user.subunitId || 
           user.additionalSubunits?.includes(channel.subunitId as any))
        );
      }
      
      return false;
    });
  },
});

export const getChannelMessages = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    // Permission check (same as getChannels)
    const hasAccess = 
      channel.type === "announcement" || 
      user.role === "SuperAdmin" ||
      (channel.type === "department" && channel.departmentId === user.departmentId) ||
      (channel.type === "subunit" && channel.departmentId === user.departmentId && (channel.subunitId === user.subunitId || user.additionalSubunits?.includes(channel.subunitId as any) || user.role === "PastoralOversight"));

    if (!hasAccess) throw new Error("Unauthorized access to channel");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(50);

    const messagesWithDetails = await Promise.all(
      messages.map(async (msg) => {
        const author = await ctx.db.get(msg.userId);
        let file = null;
        if (msg.fileId) {
          const fileDoc = await ctx.db.get(msg.fileId);
          if (fileDoc) {
            const url = await ctx.storage.getUrl(fileDoc.storageId);
            file = { ...fileDoc, url };
          }
        }
        return {
          ...msg,
          author: {
            name: author?.name || "Unknown",
            role: author?.role || "Volunteer",
            image: author?.image,
          },
          file,
        };
      })
    );

    return messagesWithDetails.reverse();
  },
});

export const sendMessage = mutation({
  args: {
    channelId: v.id("channels"),
    text: v.optional(v.string()),
    fileId: v.optional(v.id("fileUploads")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");
    if (channel.isDisabled) throw new Error("Channel is disabled");

    // Permission check
    if (channel.type === "announcement" && user.role !== "SuperAdmin") {
      throw new Error("Only SuperAdmins can post in announcements");
    }

    const hasAccess = 
      user.role === "SuperAdmin" ||
      (channel.type === "department" && channel.departmentId === user.departmentId) ||
      (channel.type === "subunit" && channel.departmentId === user.departmentId && (channel.subunitId === user.subunitId || user.additionalSubunits?.includes(channel.subunitId as any) || user.role === "PastoralOversight"));

    if (!hasAccess && channel.type !== "announcement") {
      throw new Error("Unauthorized to post in this channel");
    }

    return await ctx.db.insert("messages", {
      channelId: args.channelId,
      userId: user._id,
      text: args.text,
      fileId: args.fileId,
      isPinned: false,
      createdAt: Date.now(),
    });
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    const isAuthor = message.userId === user._id;
    const isModerator = user.role === "SuperAdmin" || user.role === "DepartmentHead" || user.role === "PastoralOversight";

    if (!isAuthor && !isModerator) {
      throw new Error("Unauthorized to delete message");
    }

    if (message.fileId) {
      const file = await ctx.db.get(message.fileId);
      if (file) {
        await ctx.storage.delete(file.storageId);
        await ctx.db.delete(message.fileId);
      }
    }

    await ctx.db.delete(args.messageId);
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  await getAuthenticatedUser(ctx);
  return await ctx.storage.generateUploadUrl();
});

export const saveFileMetadata = mutation({
  args: {
    storageId: v.id("_storage"),
    mimeType: v.string(),
    name: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db.insert("fileUploads", {
      ...args,
      userId: user._id,
    });
  },
});

export const pinMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    if (user.role !== "SuperAdmin" && user.role !== "DepartmentHead" && user.role !== "SubunitLead" && user.role !== "PastoralOversight") {
      throw new Error("Unauthorized to pin messages");
    }

    await ctx.db.patch(args.messageId, { isPinned: !message.isPinned });
  },
});

export const toggleChannelStatus = mutation({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    if (user.role !== "SuperAdmin" && user.role !== "DepartmentHead") {
      throw new Error("Unauthorized to toggle channel status");
    }

    await ctx.db.patch(args.channelId, { isDisabled: !channel.isDisabled });
  },
});

// Helper to ensure channels exist for a church
export const ensureChannels = mutation({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();

    // 1. Announcements
    if (!existing.find(c => c.type === "announcement")) {
      await ctx.db.insert("channels", {
        churchId: args.churchId,
        type: "announcement",
        name: "Church Announcements",
        isDisabled: false,
      });
    }

    // 2. User's Department
    if (user.departmentId && !existing.find(c => c.type === "department" && c.departmentId === user.departmentId)) {
      const dept = await ctx.db.get(user.departmentId as import("./_generated/dataModel").Id<"departments">);
      await ctx.db.insert("channels", {
        churchId: args.churchId,
        type: "department",
        departmentId: user.departmentId,
        name: `${dept?.name || "Department"} Chat`,
        isDisabled: false,
      });
    }

    // 3. User's Subunit
    if (user.subunitId && !existing.find(c => c.type === "subunit" && c.subunitId === user.subunitId)) {
      const sub = await ctx.db.get(user.subunitId as import("./_generated/dataModel").Id<"subunits">);
      await ctx.db.insert("channels", {
        churchId: args.churchId,
        type: "subunit",
        departmentId: user.departmentId,
        subunitId: user.subunitId,
        name: `${sub?.name || "Subunit"} Chat`,
        isDisabled: false,
      });
    }
  },
});
