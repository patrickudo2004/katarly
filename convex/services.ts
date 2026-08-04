import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

function validateMeetingUrl(platform: string, url: string) {
  if (!url.startsWith("https://")) {
    throw new Error("Meeting URL must be secure and start with https://");
  }

  if (platform === "Teams") {
    const teamsRegex = /^https:\/\/(?:[a-zA-Z0-9-]+\.)?teams\.(?:microsoft\.com|live\.com)/;
    if (!teamsRegex.test(url)) {
      throw new Error("Invalid Teams link. URL must belong to microsoft.com or live.com");
    }
  } else if (platform === "Zoom") {
    const zoomRegex = /^https:\/\/(?:[a-zA-Z0-9-]+\.)?zoom\.(?:us|com)/;
    if (!zoomRegex.test(url)) {
      throw new Error("Invalid Zoom link. URL must belong to zoom.us or zoom.com");
    }
  } else if (platform === "Meet") {
    const meetRegex = /^https:\/\/meet\.google\.com/;
    if (!meetRegex.test(url)) {
      throw new Error("Invalid Google Meet link. URL must start with https://meet.google.com");
    }
  }
}

export const generateFlyerUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const getChurchServices = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.churchId) return [];

    const services = await ctx.db
      .query("services")
      .withIndex("by_church_start_time", (q) => q.eq("churchId", user.churchId!))
      .order("desc")
      .collect();

    return await Promise.all(
      services.map(async (s) => ({
        ...s,
        flyerUrl: s.flyerStorageId ? await ctx.storage.getUrl(s.flyerStorageId) : undefined,
      }))
    );
  },
});

export const createService = mutation({
  args: {
    name: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    qrType: v.optional(v.union(v.literal("Unique"), v.literal("Generic"))),
    format: v.optional(v.union(v.literal("Physical"), v.literal("Online"), v.literal("Hybrid"))),
    platform: v.optional(v.union(v.literal("Teams"), v.literal("Zoom"), v.literal("Meet"), v.literal("Custom"))),
    meetingUrl: v.optional(v.string()),
    locationName: v.optional(v.string()),
    occurrences: v.optional(v.array(v.object({ startTime: v.number(), endTime: v.number() }))),
    customLocation: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
      address: v.string(),
      geofenceRadius: v.optional(v.number()),
    })),
    flyerStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user?.churchId) throw new Error("Church not found");

    const allowedRoles = ["SuperAdmin", "DeaconHead", "PastoralOversight"];
    if (!allowedRoles.includes(user.role || "")) {
      throw new Error("Unauthorized: Only SuperAdmin, DeaconHead, or PastoralOversight can create services.");
    }

    const format = args.format || "Physical";
    if (format === "Online" || format === "Hybrid") {
      if (!args.meetingUrl) {
        throw new Error("Meeting URL is required for online or hybrid services");
      }
      validateMeetingUrl(args.platform || "Custom", args.meetingUrl);
    }

    const church = await ctx.db.get(user.churchId);
    const resolvedQrType = args.qrType || church?.settings?.defaultQrType || "Unique";

    const servicesToCreate = args.occurrences && args.occurrences.length > 0 
      ? args.occurrences 
      : [{ startTime: args.startTime, endTime: args.endTime }];

    const createdIds = [];
    for (const occ of servicesToCreate) {
      const qrCodeSecret = Math.random().toString(36).substring(2, 15) + 
                           Math.random().toString(36).substring(2, 15);

      const serviceId = await ctx.db.insert("services", {
        churchId: user.churchId,
        name: args.name,
        startTime: occ.startTime,
        endTime: occ.endTime,
        qrCodeSecret,
        qrType: resolvedQrType,
        format,
        platform: args.platform,
        meetingUrl: args.meetingUrl,
        locationName: args.locationName,
        customLocation: args.customLocation,
        flyerStorageId: args.flyerStorageId,
      });
      createdIds.push(serviceId);
    }

    // Chat Announcement
    if (createdIds.length > 0) {
      try {
        const channel = await ctx.db
          .query("channels")
          .withIndex("by_church", (q) => q.eq("churchId", user.churchId!))
          .filter((q) => q.eq(q.field("type"), "announcement"))
          .first();

        if (channel && !channel.isDisabled) {
          const firstOcc = servicesToCreate[0];
          const formatDate = new Date(firstOcc.startTime).toLocaleDateString();
          const formatTime = new Date(firstOcc.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const isSeries = createdIds.length > 1;

          const chatMsg = isSeries
            ? `📅 *New Service Series Scheduled*: *${args.name}*\n⏰ Starting ${formatDate} @ ${formatTime} (${createdIds.length} occurrences)\n📍 Format: *${format}* ${args.locationName ? `(${args.locationName})` : ''}\n👉 View shifts and sign up: https://servesync-pi.vercel.app/service-management`
            : `📅 *New Service Scheduled*: *${args.name}*\n⏰ ${formatDate} @ ${formatTime}\n📍 Format: *${format}* ${args.locationName ? `(${args.locationName})` : ''}\n👉 View shifts and check-in: https://servesync-pi.vercel.app/service-management`;

          await ctx.db.insert("messages", {
            channelId: channel._id,
            userId,
            text: chatMsg,
            isPinned: false,
            createdAt: Date.now(),
          });
        }
      } catch (err) {
        console.error("Failed to post service announcement:", err);
      }
    }

    return createdIds[0];
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

export const updateService = mutation({
  args: {
    id: v.id("services"),
    name: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    qrType: v.optional(v.union(v.literal("Unique"), v.literal("Generic"))),
    format: v.union(v.literal("Physical"), v.literal("Online"), v.literal("Hybrid")),
    platform: v.optional(v.union(v.literal("Teams"), v.literal("Zoom"), v.literal("Meet"), v.literal("Custom"))),
    meetingUrl: v.optional(v.string()),
    locationName: v.optional(v.string()),
    customLocation: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
      address: v.string(),
      geofenceRadius: v.optional(v.number()),
    })),
    flyerStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User context not found");

    const service = await ctx.db.get(args.id);
    if (!service) throw new Error("Service not found");

    const allowedRoles = ["SuperAdmin", "DeaconHead", "PastoralOversight"];
    if (!allowedRoles.includes(user.role || "")) {
      throw new Error("Unauthorized: Only SuperAdmin, DeaconHead, or PastoralOversight can modify services.");
    }

    if (args.format === "Online" || args.format === "Hybrid") {
      if (!args.meetingUrl) {
        throw new Error("Meeting URL is required for online or hybrid services");
      }
      validateMeetingUrl(args.platform || "Custom", args.meetingUrl);
    }

    await ctx.db.patch(args.id, {
      name: args.name,
      startTime: args.startTime,
      endTime: args.endTime,
      qrType: args.qrType,
      format: args.format,
      platform: args.platform,
      meetingUrl: args.meetingUrl,
      locationName: args.locationName,
      customLocation: args.customLocation,
      flyerStorageId: args.flyerStorageId,
    });
  },
});

export const getServiceDetails = query({
  args: { serviceId: v.id("services") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user?.churchId) return null;

    const service = await ctx.db.get(args.serviceId);
    if (!service || service.churchId !== user.churchId) return null;

    const flyerUrl = service.flyerStorageId ? await ctx.storage.getUrl(service.flyerStorageId) : undefined;

    // Fetch active rota slots for this service
    const rotas = await ctx.db
      .query("rotas")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .collect();

    const rotaDetails = await Promise.all(
      rotas.map(async (r) => {
        const u = r.userId ? await ctx.db.get(r.userId) : null;
        return {
          ...r,
          userName: u?.name || u?.email || null,
          userImage: u?.image || null,
        };
      })
    );

    return {
      ...service,
      flyerUrl,
      rotas: rotaDetails,
    };
  },
});

export const getUpcomingServices = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.churchId) return [];

    const now = Date.now() - 2 * 60 * 60 * 1000; // 2 hours buffer
    return await ctx.db
      .query("services")
      .withIndex("by_church_start_time", (q) => 
        q.eq("churchId", user.churchId!)
         .gt("startTime", now)
      )
      .order("asc")
      .take(20);
  },
});


