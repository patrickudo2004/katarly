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

function hasChannelAccess(user: any, channel: any): boolean {
  if (channel.churchId !== user.churchId) return false;

  // 1. Announcements: Visible to all church members
  if (channel.type === "announcement") return true;

  // 2. Deacon Board: Visible ONLY to DeaconHead and SuperAdmin
  if (channel.type === "deaconBoard") {
    return user.role === "DeaconHead" || user.role === "SuperAdmin";
  }

  // 3. SuperAdmin and DeaconHead: Global access to all other channels (departments, subunits)
  if (user.role === "SuperAdmin" || user.role === "DeaconHead") {
    return true;
  }

  // 4. PastoralOversight: Access to all department and subunit channels (no deacon board)
  if (user.role === "PastoralOversight") {
    return channel.type === "department" || channel.type === "subunit";
  }

  // 5. Department leadership: Access to their own department and all subunit channels under their department
  const isDeptLeader = 
    user.role === "DepartmentHead" || 
    user.role === "DepartmentAssistant" || 
    user.role === "DepartmentSecretary";

  if (isDeptLeader) {
    if (channel.type === "department") {
      return channel.departmentId === user.departmentId;
    }
    if (channel.type === "subunit") {
      return channel.departmentId === user.departmentId;
    }
  }

  // 6. Subunit leadership: Access to department channel, and specific subunit channels they lead
  const isSubunitLeader = 
    user.role === "SubunitLead" || 
    user.role === "SubunitAssistant";

  if (isSubunitLeader) {
    if (channel.type === "department") {
      return channel.departmentId === user.departmentId;
    }
    if (channel.type === "subunit") {
      return (
        channel.subunitId === user.subunitId ||
        user.additionalSubunits?.includes(channel.subunitId)
      );
    }
  }

  // 7. Volunteers & others (Volunteer, Probation, OnNotice, etc.):
  // Access to their department channel, and their subunit channel (plus additional subunits)
  if (channel.type === "department") {
    return channel.departmentId === user.departmentId;
  }
  if (channel.type === "subunit") {
    return (
      channel.subunitId === user.subunitId ||
      user.additionalSubunits?.includes(channel.subunitId)
    );
  }

  return false;
}

export const getChannels = query({
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user.churchId) return [];

    const channels = await ctx.db
      .query("channels")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId!))
      .collect();

    // Filter based on permissions helper
    return channels.filter((channel) => hasChannelAccess(user, channel));
  },
});

export const getChannelMessages = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const channel = await ctx.db.get(args.channelId);
    if (!channel) throw new Error("Channel not found");

    if (!hasChannelAccess(user, channel)) {
      throw new Error("Unauthorized access to channel");
    }

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

    if (!hasChannelAccess(user, channel)) {
      throw new Error("Unauthorized to post in this channel");
    }

    if (channel.type === "announcement" && user.role !== "SuperAdmin") {
      throw new Error("Only SuperAdmins can post in announcements");
    }

    const messageId = await ctx.db.insert("messages", {
      channelId: args.channelId,
      userId: user._id,
      text: args.text,
      fileId: args.fileId,
      isPinned: false,
      createdAt: Date.now(),
    });

    return messageId;
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
      storageId: args.storageId,
      mimeType: args.mimeType,
      name: args.name,
      size: args.size,
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
    if (user.churchId !== args.churchId && user.role !== "SuperAdmin") {
      throw new Error("Unauthorized to access this church's channels");
    }

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

    // 2. Deacon Board
    if (!existing.find(c => c.type === "deaconBoard")) {
      await ctx.db.insert("channels", {
        churchId: args.churchId,
        type: "deaconBoard",
        name: "Deacon Board",
        isDisabled: false,
      });
    }

    // 3. Departments
    const departments = await ctx.db
      .query("departments")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();

    for (const dept of departments) {
      if (!existing.find(c => c.type === "department" && c.departmentId === dept._id)) {
        await ctx.db.insert("channels", {
          churchId: args.churchId,
          type: "department",
          departmentId: dept._id,
          name: `${dept.name} Chat`,
          isDisabled: false,
        });
      }
    }

    // 4. Subunits
    const subunits = await ctx.db
      .query("subunits")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();

    for (const sub of subunits) {
      if (!existing.find(c => c.type === "subunit" && c.subunitId === sub._id)) {
        await ctx.db.insert("channels", {
          churchId: args.churchId,
          type: "subunit",
          departmentId: sub.departmentId,
          subunitId: sub._id,
          name: `${sub.name} Chat`,
          isDisabled: false,
        });
      }
    }
  },
});
