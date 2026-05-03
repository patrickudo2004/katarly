import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { checkMilestonesInternal } from "./recognition";

// Helper for geofence distance calculation (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

async function validateAndMark(
  ctx: any, 
  userId: any, 
  churchId: any, 
  service: any, 
  args: { lat: number; lng: number; accuracy: number; qrSecret: string }
) {
  const church = await ctx.db.get(churchId);
  if (!church) throw new Error("Church not found");

  // 1. Verify QR Secret
  // If it's a specific service secret, it must match.
  // If it's a church daily secret, it must match church.settings.qrCodeSecret.
  const isMatch = service.qrCodeSecret === args.qrSecret || church.settings?.qrCodeSecret === args.qrSecret;
  if (!isMatch) {
    throw new Error("Invalid or expired QR code");
  }

  // 2. Verify Time Window
  const now = Date.now();
  const windowMs = (church.settings?.attendanceWindowMinutes || 30) * 60 * 1000;
  if (now < service.startTime - windowMs || now > service.endTime + windowMs) {
    throw new Error(`Attendance window for "${service.name}" is closed`);
  }

  // 3. Verify Geofence
  if (church.location) {
    const distance = calculateDistance(args.lat, args.lng, church.location.lat, church.location.lng);
    if (distance > (church.settings?.geofenceRadius || 100)) {
      throw new Error(`You are too far from the church (${Math.round(distance)}m away)`);
    }
  }

  // 4. Check if already marked
  const existing = await ctx.db
    .query("attendance")
    .withIndex("by_service", (q: any) => q.eq("serviceId", service._id))
    .filter((q: any) => q.eq(q.field("userId"), userId))
    .first();

  if (existing) return existing._id;

  // 5. Determine Status (Late vs Present)
  const status = now > service.startTime + 15 * 60 * 1000 ? "Late" : "Present";

  const attendanceId = await ctx.db.insert("attendance", {
    serviceId: service._id,
    userId: userId,
    churchId: churchId,
    timestamp: now,
    method: "QR",
    markedById: userId,
    location: {
      lat: args.lat,
      lng: args.lng,
      accuracy: args.accuracy,
    },
    status,
  });

  await checkMilestonesInternal(ctx, userId);
  return attendanceId;
}

export const markAttendance = mutation({
  args: {
    serviceId: v.id("services"),
    qrSecret: v.string(),
    lat: v.number(),
    lng: v.number(),
    accuracy: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const service = await ctx.db.get(args.serviceId);
    if (!service) throw new Error("Service not found");

    return await validateAndMark(ctx, userId, user.churchId, service, args);
  },
});

export const markDailyAttendance = mutation({
  args: {
    churchId: v.id("churches"),
    qrSecret: v.string(),
    lat: v.number(),
    lng: v.number(),
    accuracy: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    // Find services happening today for this church
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const services = await ctx.db
      .query("services")
      .withIndex("by_church", q => q.eq("churchId", args.churchId))
      .filter(q => q.and(
        q.gte(q.field("startTime"), startOfDay),
        q.lt(q.field("startTime"), endOfDay)
      ))
      .collect();

    if (services.length === 0) throw new Error("No services scheduled for today.");

    // Find the closest service to 'now'
    const currentTime = Date.now();
    const church = await ctx.db.get(args.churchId);
    const windowMs = (church?.settings?.attendanceWindowMinutes || 30) * 60 * 1000;

    const activeService = services.find(s => 
      currentTime >= s.startTime - windowMs && currentTime <= s.endTime + windowMs
    );

    if (!activeService) {
      throw new Error("You are scanning outside of any active service window today.");
    }

    return await validateAndMark(ctx, userId, args.churchId, activeService, args);
  },
});

export const manualMark = mutation({
  args: {
    serviceId: v.id("services"),
    userId: v.id("users"),
    status: v.union(v.literal("Present"), v.literal("Late"), v.literal("Excused")),
    markedById: v.id("users"),
  },
  handler: async (ctx, args) => {
    const marker = await ctx.db.get(args.markedById);
    if (!marker || !["SuperAdmin", "DepartmentHead", "SubunitLead", "PastoralOversight"].includes(marker.role)) {
      throw new Error("Unauthorized to mark attendance manually");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const attendanceId = await ctx.db.insert("attendance", {
      serviceId: args.serviceId,
      userId: args.userId,
      churchId: user.churchId,
      timestamp: Date.now(),
      method: "Manual",
      markedById: args.markedById,
      status: args.status,
    });

    await checkMilestonesInternal(ctx, args.userId);

    return attendanceId;
  },
});

export const getTodayServices = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    return await ctx.db
      .query("services")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => q.and(
        q.gte(q.field("startTime"), startOfDay),
        q.lt(q.field("startTime"), endOfDay)
      ))
      .collect();
  },
});

export const requestVerification = mutation({
  args: {
    serviceId: v.id("services"),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const service = await ctx.db.get(args.serviceId);
    if (!service) throw new Error("Service not found");

    // Check if a pending request already exists
    const existing = await ctx.db
      .query("verificationRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.and(
        q.eq(q.field("serviceId"), args.serviceId),
        q.eq(q.field("status"), "pending")
      ))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("verificationRequests", {
      userId,
      serviceId: args.serviceId,
      churchId: user.churchId,
      status: "pending",
      requestedAt: Date.now(),
      location: args.lat && args.lng ? { lat: args.lat, lng: args.lng } : undefined,
    });
  },
});

export const getPendingVerifications = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user) return [];

    let requests = await ctx.db
      .query("verificationRequests")
      .withIndex("by_church_status", (q) => q.eq("churchId", args.churchId).eq("status", "pending"))
      .collect();

    // Attach user and service info first so we can filter by department/subunit
    const hydratedRequests = await Promise.all(
      requests.map(async (req) => {
        const requester = await ctx.db.get(req.userId);
        const service = await ctx.db.get(req.serviceId);
        return {
          ...req,
          userName: requester?.name || "Unknown",
          userRole: requester?.role,
          userDeptId: requester?.departmentId,
          userSubunitId: requester?.subunitId,
          serviceName: service?.name || "Unknown",
          serviceStartTime: service?.startTime,
        };
      })
    );

    // Apply role-based filtering
    if (user.role === "SuperAdmin") {
      return hydratedRequests;
    } else if (user.role === "DeaconHead" || user.role === "DepartmentHead") {
      return hydratedRequests.filter(r => r.userDeptId === user.departmentId);
    } else if (user.role === "SubunitLead") {
      return hydratedRequests.filter(r => r.userSubunitId === user.subunitId);
    }

    return []; // Volunteers see nothing
  },
});

export const approveVerification = mutation({
  args: { requestId: v.id("verificationRequests") },
  handler: async (ctx, args) => {
    const leadId = await auth.getUserId(ctx);
    if (!leadId) throw new Error("Not authenticated");
    
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.status !== "pending") throw new Error("Request already processed");

    // Update request status
    await ctx.db.patch(args.requestId, { status: "approved" });

    // Mark attendance
    const service = await ctx.db.get(request.serviceId);
    const now = Date.now();
    const status = now > (service?.startTime || 0) + 15 * 60 * 1000 ? "Late" : "Present";

    const attendanceId = await ctx.db.insert("attendance", {
      serviceId: request.serviceId,
      userId: request.userId,
      churchId: request.churchId,
      timestamp: now,
      method: "Override",
      verifiedById: leadId,
      status,
    });

    await checkMilestonesInternal(ctx, request.userId);
    return attendanceId;
  },
});

export const declineVerification = mutation({
  args: { requestId: v.id("verificationRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    await ctx.db.patch(args.requestId, { status: "declined" });
  },
});

export const getServiceAttendance = query({
  args: { serviceId: v.id("services") },
  handler: async (ctx, args) => {
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .collect();

    return await Promise.all(
      attendance.map(async (record) => {
        const user = await ctx.db.get(record.userId);
        return {
          ...record,
          user: {
            name: user?.name || user?.email || "Unknown",
            image: user?.image,
          }
        };
      })
    );
  },
});
