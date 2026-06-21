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
  args: { lat?: number; lng?: number; accuracy?: number; qrSecret: string }
) {
  const church = await ctx.db.get(churchId);
  if (!church) throw new Error("Church not found");

  // 1. Verify QR Secret
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

  // Retrieve rota entry to inspect if steward is assigned online/virtually
  const rotaEntry = await ctx.db
    .query("rotas")
    .withIndex("by_service_user", (q: any) => q.eq("serviceId", service._id).eq("userId", userId))
    .first();

  // 3. Verify Geofence
  const userLat = typeof args.lat === 'number' ? args.lat : undefined;
  const userLng = typeof args.lng === 'number' ? args.lng : undefined;

  const isOnlineService = service.format === "Online";
  const isOnlineSteward = service.format === "Hybrid" && (
    rotaEntry?.roleFormat === "Online" || 
    /online|virtual|stream|moderator|chat/i.test(rotaEntry?.role || "")
  );

  const bypassGeofence = isOnlineService || isOnlineSteward;

  if (church.location && !bypassGeofence) {
    if (userLat === undefined || userLng === undefined) {
      throw new Error("GPS coordinates are required to check in at this church.");
    }
    const distance = calculateDistance(userLat, userLng, church.location.lat, church.location.lng);
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

  // 5. Determine Department/Subunit from Rota (Multi-role support)
  // Fallback to user's primary dept if no specific rota entry exists for this service
  const user = await ctx.db.get(userId);
  const departmentId = rotaEntry?.departmentId || user?.departmentId || undefined;
  const subunitId = rotaEntry?.subunitId || user?.subunitId || undefined;

  // 6. Determine Status (Late vs Present)
  const status = now > service.startTime + 15 * 60 * 1000 ? "Late" : "Present";

  const attendanceId = await ctx.db.insert("attendance", {
    serviceId: service._id,
    userId: userId,
    churchId: churchId,
    departmentId,
    subunitId,
    timestamp: now,
    method: "QR",
    markedById: userId,
    location: (userLat !== undefined && userLng !== undefined) ? {
      lat: userLat,
      lng: userLng,
      accuracy: args.accuracy ?? 0,
    } : undefined,
    status,
  });

  await checkMilestonesInternal(ctx, userId);
  return attendanceId;
}

export const markAttendance = mutation({
  args: {
    serviceId: v.id("services"),
    qrSecret: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    accuracy: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    if (!user.churchId) throw new Error("User has no church assigned");

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
  },
  handler: async (ctx, args) => {
    const markedById = await auth.getUserId(ctx);
    if (!markedById) throw new Error("Not authenticated");
    
    const marker = await ctx.db.get(markedById);
    if (!marker || !marker.role || !["SuperAdmin", "DepartmentHead", "SubunitLead", "PastoralOversight"].includes(marker.role)) {
      throw new Error("Unauthorized to mark attendance manually");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    if (user.churchId !== marker.churchId) {
      throw new Error("Unauthorized: Cross-church operation blocked");
    }

    const attendanceId = await ctx.db.insert("attendance", {
      serviceId: args.serviceId,
      userId: args.userId,
      churchId: user.churchId!,
      timestamp: Date.now(),
      method: "Manual",
      markedById: markedById,
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
    const lead = await ctx.db.get(leadId);
    if (!lead || !lead.role || !["SuperAdmin", "DeaconHead", "DepartmentHead", "SubunitLead"].includes(lead.role)) {
      throw new Error("Unauthorized");
    }
    
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.status !== "pending") throw new Error("Request already processed");
    if (request.churchId !== lead.churchId) {
      throw new Error("Unauthorized: Cross-church operation blocked");
    }

    // Update request status
    await ctx.db.patch(args.requestId, { status: "approved" });

    // Mark attendance
    const service = await ctx.db.get(request.serviceId);
    const now = Date.now();
    const status = now > (service?.startTime || 0) + 15 * 60 * 1000 ? "Late" : "Present";

    // Determine Dept/Subunit for manual mark
    const rotaEntry = await ctx.db
      .query("rotas")
      .withIndex("by_service_user", (q: any) => q.eq("serviceId", request.serviceId).eq("userId", request.userId))
      .first();
    const requester = await ctx.db.get(request.userId);
    const departmentId = rotaEntry?.departmentId || requester?.departmentId || undefined;
    const subunitId = rotaEntry?.subunitId || requester?.subunitId || undefined;

    const attendanceId = await ctx.db.insert("attendance", {
      serviceId: request.serviceId,
      userId: request.userId,
      churchId: request.churchId,
      departmentId,
      subunitId,
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
    const leadId = await auth.getUserId(ctx);
    if (!leadId) throw new Error("Not authenticated");
    const lead = await ctx.db.get(leadId);
    if (!lead || !lead.role || !["SuperAdmin", "DeaconHead", "DepartmentHead", "SubunitLead"].includes(lead.role)) {
      throw new Error("Unauthorized");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");
    if (request.churchId !== lead.churchId) {
      throw new Error("Unauthorized: Cross-church operation blocked");
    }

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

export const getAttendanceInsights = query({
  args: {
    serviceId: v.optional(v.union(v.id("services"), v.null())),
    departmentId: v.optional(v.union(v.id("departments"), v.null())),
    subunitId: v.optional(v.union(v.id("subunits"), v.null())),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    let query = ctx.db
      .query("attendance")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId!));

    // Time filtering
    if (args.startDate) query = query.filter((q) => q.gte(q.field("timestamp"), args.startDate!));
    if (args.endDate) query = query.filter((q) => q.lte(q.field("timestamp"), args.endDate!));

    // Service filtering
    if (args.serviceId) query = query.filter((q) => q.eq(q.field("serviceId"), args.serviceId));

    // Role-based Scoping + Manual Filtering
    const userRole = user.role || "";
    const deptRoles = ["DeaconHead", "PastoralOversight", "DepartmentHead", "DepartmentAssistant", "DepartmentSecretary"];
    const subunitRoles = ["SubunitLead", "SubunitAssistant"];

    if (userRole === "SuperAdmin") {
      if (args.departmentId) query = query.filter(q => q.eq(q.field("departmentId"), args.departmentId));
      if (args.subunitId) query = query.filter(q => q.eq(q.field("subunitId"), args.subunitId));
    } else if (deptRoles.includes(userRole)) {
      query = query.filter(q => q.eq(q.field("departmentId"), user.departmentId));
      if (args.subunitId) {
        const subunit = (await ctx.db.get(args.subunitId as any)) as any;
        if (subunit && subunit.departmentId === user.departmentId) {
          query = query.filter(q => q.eq(q.field("subunitId"), args.subunitId));
        } else {
          query = query.filter(q => q.eq(q.field("subunitId"), "unauthorized_subunit" as any));
        }
      }
    } else if (subunitRoles.includes(userRole)) {
      query = query.filter(q => q.eq(q.field("subunitId"), user.subunitId));
    } else {
      throw new Error("Unauthorized");
    }

    const records = await query.collect();

    const stats = {
      total: records.length,
      present: records.filter(r => r.status === "Present").length,
      late: records.filter(r => r.status === "Late").length,
      excused: records.filter(r => r.status === "Excused").length,
    };

    return stats;
  },
});

export const getHistoricalAttendance = query({
  args: {
    departmentId: v.optional(v.union(v.id("departments"), v.null())),
    subunitId: v.optional(v.union(v.id("subunits"), v.null())),
    serviceId: v.optional(v.union(v.id("services"), v.null())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user) return [];

    const userRole = user.role || "";
    const deptRoles = ["DeaconHead", "PastoralOversight", "DepartmentHead", "DepartmentAssistant", "DepartmentSecretary"];
    const subunitRoles = ["SubunitLead", "SubunitAssistant"];

    let finalDeptId: string | null = args.departmentId || null;
    let finalSubunitId: string | null = args.subunitId || null;

    if (userRole !== "SuperAdmin") {
      if (deptRoles.includes(userRole)) {
        if (!user.departmentId) return [];
        finalDeptId = user.departmentId;
        // Verify subunit belongs to their department
        if (finalSubunitId) {
          const subunit = (await ctx.db.get(finalSubunitId as any)) as any;
          if (!subunit || subunit.departmentId !== finalDeptId) {
            finalSubunitId = null;
          }
        }
      } else if (subunitRoles.includes(userRole)) {
        if (!user.subunitId) return [];
        finalSubunitId = user.subunitId;
        finalDeptId = user.departmentId || null;
      } else {
        return [];
      }
    }

    let query = ctx.db
      .query("attendance")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId!))
      .order("desc");

    if (finalDeptId) query = query.filter(q => q.eq(q.field("departmentId"), finalDeptId));
    if (finalSubunitId) query = query.filter(q => q.eq(q.field("subunitId"), finalSubunitId));
    if (args.serviceId) query = query.filter(q => q.eq(q.field("serviceId"), args.serviceId));

    const records = await query.take(args.limit || 100);

    return Promise.all(records.map(async (r) => {
      const u = await ctx.db.get(r.userId);
      const s = await ctx.db.get(r.serviceId);
      return {
        ...r,
        userName: u?.name || u?.email || "Unknown",
        serviceName: s?.name || "Unknown",
      };
    }));
  },
});

export const getMyAttendance = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const records = await ctx.db
      .query("attendance")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit || 50);

    return Promise.all(records.map(async (r) => {
      const s = await ctx.db.get(r.serviceId);
      return {
        ...r,
        serviceName: s?.name || "Unknown",
      };
    }));
  },
});

export const getLatestVerificationStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    // Get the most recent request in the last 15 minutes
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
    
    const request = await ctx.db
      .query("verificationRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .filter((q) => q.gt(q.field("requestedAt"), fifteenMinutesAgo))
      .first();

    return request;
  },
});

export const generateCheckInToken = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const token = `${randomPart}:${Date.now()}`;
    await ctx.db.patch(userId, { tempCheckInToken: token });
    return token;
  },
});

export const verifyAndMarkCheckIn = mutation({
  args: {
    targetUserId: v.id("users"),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const scannerId = await auth.getUserId(ctx);
    if (!scannerId) throw new Error("Not authenticated");

    const scannerUser = await ctx.db.get(scannerId);
    if (!scannerUser) throw new Error("Scanner not found");

    // 1. Verify that scanner has a supervisor role (>= SubunitLead or SubunitAssistant)
    const supervisorRoles = [
      "SuperAdmin",
      "DeaconHead",
      "PastoralOversight",
      "DepartmentHead",
      "DepartmentAssistant",
      "DepartmentSecretary",
      "SubunitLead",
      "SubunitAssistant"
    ];
    if (!scannerUser.role || !supervisorRoles.includes(scannerUser.role)) {
      throw new Error("Unauthorized: Only leaders and supervisors can scan QR passes");
    }

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) throw new Error("Target user not found");

    // 2. Verify target volunteer belongs to the same church as the scanner
    if (!scannerUser.churchId) {
      throw new Error("Scanner has no church assigned");
    }
    if (!targetUser.churchId) {
      throw new Error("Volunteer has no church assigned");
    }
    if (targetUser.churchId !== scannerUser.churchId) {
      throw new Error("Unauthorized: Volunteer is not in your church");
    }

    // 3. Match token and verify timestamp (< 5 minutes old)
    if (!targetUser.tempCheckInToken || targetUser.tempCheckInToken !== args.token) {
      throw new Error("Invalid or expired check-in pass");
    }

    const parts = args.token.split(":");
    if (parts.length < 2) {
      throw new Error("Malformed check-in token");
    }
    const timestamp = parseInt(parts[1], 10);
    if (isNaN(timestamp) || Date.now() - timestamp > 5 * 60 * 1000) {
      throw new Error("Check-in token has expired");
    }

    // 4. Retrieve active service starting in next 2 hours or started in last 30 minutes
    const nowMs = Date.now();
    const minStartTime = nowMs - 30 * 60 * 1000;
    const maxStartTime = nowMs + 2 * 60 * 60 * 1000;

    const services = await ctx.db
      .query("services")
      .withIndex("by_church", (q) => q.eq("churchId", scannerUser.churchId!))
      .filter((q) =>
        q.and(
          q.gte(q.field("startTime"), minStartTime),
          q.lte(q.field("startTime"), maxStartTime)
        )
      )
      .collect();

    if (services.length === 0) {
      throw new Error("No active service found starting in the next 2 hours or started in the last 30 minutes");
    }

    // Sort by proximity to nowMs
    services.sort((a, b) => Math.abs(a.startTime - nowMs) - Math.abs(b.startTime - nowMs));
    const activeService = services[0];

    // 5. Check if already checked in
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_service", (q) => q.eq("serviceId", activeService._id))
      .filter((q) => q.eq(q.field("userId"), args.targetUserId))
      .first();

    if (existing) {
      // Clear token and return existing attendance id
      await ctx.db.patch(args.targetUserId, { tempCheckInToken: undefined });
      return existing._id;
    }

    // 6. Determine department and subunit from Rota (or fallback to profile)
    const rotaEntry = await ctx.db
      .query("rotas")
      .withIndex("by_service_user", (q) => q.eq("serviceId", activeService._id).eq("userId", args.targetUserId))
      .first();

    const departmentId = rotaEntry?.departmentId || targetUser.departmentId || undefined;
    const subunitId = rotaEntry?.subunitId || targetUser.subunitId || undefined;

    // Determine status (Late if current time is service.startTime + lateThresholdMinutes)
    const church = await ctx.db.get(scannerUser.churchId);
    const lateThresholdMinutes = church?.settings?.lateThresholdMinutes ?? 15;
    const status = nowMs > activeService.startTime + lateThresholdMinutes * 60 * 1000 ? "Late" : "Present";

    // Insert attendance record
    const attendanceId = await ctx.db.insert("attendance", {
      serviceId: activeService._id,
      userId: args.targetUserId,
      churchId: scannerUser.churchId!,
      departmentId,
      subunitId,
      timestamp: nowMs,
      status,
      method: "Supervisor QR Scan",
      markedById: scannerId,
      verifiedById: scannerId,
    });

    // Check milestones
    await checkMilestonesInternal(ctx, args.targetUserId);

    // 7. Clear check-in token on successful check-in
    await ctx.db.patch(args.targetUserId, { tempCheckInToken: undefined });

    return attendanceId;
  },
});

