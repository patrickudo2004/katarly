import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

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

function validateMeetingUrl(platform: string, url: string) {
  if (!url.startsWith("https://")) {
    throw new Error("Meeting URL must be secure and start with https://");
  }

  if (platform === "Teams") {
    // Matches teams.microsoft.com, teams.live.com, etc.
    const teamsRegex = /^https:\/\/(?:[a-zA-Z0-9-]+\.)?teams\.(?:microsoft\.com|live\.com)/;
    if (!teamsRegex.test(url)) {
      throw new Error("Invalid Teams link. URL must belong to microsoft.com or live.com");
    }
  } else if (platform === "Zoom") {
    // Matches *.zoom.us or zoom.com
    const zoomRegex = /^https:\/\/(?:[a-zA-Z0-9-]+\.)?zoom\.(?:us|com)/;
    if (!zoomRegex.test(url)) {
      throw new Error("Invalid Zoom link. URL must belong to zoom.us or zoom.com");
    }
  } else if (platform === "Meet") {
    // Matches meet.google.com
    const meetRegex = /^https:\/\/meet\.google\.com/;
    if (!meetRegex.test(url)) {
      throw new Error("Invalid Google Meet link. URL must start with https://meet.google.com");
    }
  }
}

export const createMeeting = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    scope: v.union(v.literal("ChurchWide"), v.literal("Departmental"), v.literal("Subunit")),
    departmentId: v.optional(v.id("departments")),
    subunitId: v.optional(v.id("subunits")),
    startTime: v.number(),
    endTime: v.number(),
    format: v.union(v.literal("Physical"), v.literal("Online"), v.literal("Hybrid")),
    platform: v.union(v.literal("Teams"), v.literal("Zoom"), v.literal("Meet"), v.literal("Custom")),
    meetingUrl: v.optional(v.string()),
    locationName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user || !user.churchId) throw new Error("User context not found");

    const churchId = user.churchId;

    // Validate role permissions based on scope
    if (args.scope === "ChurchWide") {
      if (user.role !== "SuperAdmin" && user.role !== "DeaconHead") {
        throw new Error("Only SuperAdmins and DeaconHeads can schedule Church-wide meetings");
      }
    } else if (args.scope === "Departmental") {
      const allowedRoles = ["SuperAdmin", "DeaconHead", "PastoralOversight", "DepartmentHead", "DepartmentAssistant", "DepartmentSecretary"];
      if (!allowedRoles.includes(user.role || "")) {
        throw new Error("Unauthorized to schedule departmental meetings");
      }
      if (!args.departmentId) {
        throw new Error("departmentId is required for Departmental scope");
      }
      // Non-SuperAdmins/DeaconHeads can only schedule for their own department
      if (user.role !== "SuperAdmin" && user.role !== "DeaconHead" && user.departmentId !== args.departmentId) {
        throw new Error("You can only schedule meetings for your own department");
      }
    } else if (args.scope === "Subunit") {
      const allowedRoles = ["SuperAdmin", "DeaconHead", "DepartmentHead", "SubunitLead", "SubunitAssistant"];
      if (!allowedRoles.includes(user.role || "")) {
        throw new Error("Unauthorized to schedule subunit meetings");
      }
      if (!args.subunitId) {
        throw new Error("subunitId is required for Subunit scope");
      }
      // Non-SuperAdmins can only schedule for their own subunit
      if (user.role !== "SuperAdmin" && user.role !== "DeaconHead" && user.role !== "DepartmentHead" && user.subunitId !== args.subunitId) {
        throw new Error("You can only schedule meetings for your own subunit");
      }
    }

    // Validate URL if format is Online or Hybrid
    if (args.format === "Online" || args.format === "Hybrid") {
      if (!args.meetingUrl) {
        throw new Error("Meeting URL is required for online or hybrid meetings");
      }
      validateMeetingUrl(args.platform, args.meetingUrl);
    }

    // Generate random secret if physical check-in is supported
    let qrCodeSecret = undefined;
    if (args.format === "Physical" || args.format === "Hybrid") {
      qrCodeSecret = `${args.scope.toUpperCase()}:MEET:${Math.random().toString(36).substring(2, 15)}`;
      if (!args.locationName) {
        throw new Error("Location name is required for physical or hybrid meetings");
      }
    }

    const meetingId = await ctx.db.insert("meetings", {
      churchId,
      name: args.name,
      description: args.description,
      scope: args.scope,
      departmentId: args.departmentId,
      subunitId: args.subunitId,
      startTime: args.startTime,
      endTime: args.endTime,
      format: args.format,
      platform: args.platform,
      meetingUrl: args.meetingUrl,
      locationName: args.locationName,
      qrCodeSecret,
      createdBy: userId,
    });

    // Notify scoped members asynchronously
    try {
      let usersQuery = ctx.db
        .query("users")
        .withIndex("by_church", (q) => q.eq("churchId", churchId))
        .filter((q) => q.eq(q.field("status"), "active"));

      if (args.scope === "Departmental" && args.departmentId) {
        usersQuery = ctx.db
          .query("users")
          .withIndex("by_dept", (q) => q.eq("churchId", churchId).eq("departmentId", args.departmentId))
          .filter((q) => q.eq(q.field("status"), "active"));
      } else if (args.scope === "Subunit" && args.subunitId) {
        usersQuery = usersQuery.filter((q) => q.eq(q.field("subunitId"), args.subunitId));
      }

      const users = await usersQuery.collect();
      const formatTime = new Date(args.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const formatDate = new Date(args.startTime).toLocaleDateString();

      for (const u of users) {
        if (u._id === userId) continue; // Skip notifying creator
        await ctx.db.insert("notifications", {
          userId: u._id,
          title: `📅 New Gathering Scheduled`,
          message: `"${args.name}" (${args.format}) is scheduled for ${formatDate} at ${formatTime}.`,
          type: "meeting",
          read: false,
        });
      }
    } catch (err) {
      console.error("Failed to dispatch meeting notifications:", err);
    }

    return meetingId;
  },
});

export const deleteMeeting = mutation({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw new Error("Meeting not found");

    // Only creator or SuperAdmin can delete
    if (meeting.createdBy !== userId && user.role !== "SuperAdmin") {
      throw new Error("Only the creator or a SuperAdmin can delete this meeting");
    }

    // Also delete attendance records for this meeting
    const attendanceRecords = await ctx.db
      .query("meetingAttendance")
      .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
      .collect();

    for (const record of attendanceRecords) {
      await ctx.db.delete(record._id);
    }

    await ctx.db.delete(args.meetingId);
  },
});

export const getMeetingsForUser = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user || !user.churchId) return [];

    const churchId = user.churchId;

    // Pull all meetings for this church
    const allMeetings = await ctx.db
      .query("meetings")
      .withIndex("by_church", (q) => q.eq("churchId", churchId))
      .collect();

    // Filter based on user's department and subunit mappings
    const filtered = allMeetings.filter((meeting) => {
      // 1. ChurchWide is always visible
      if (meeting.scope === "ChurchWide") return true;

      // 2. Departmental is visible to users in that department
      if (meeting.scope === "Departmental") {
        return user.role === "SuperAdmin" || user.role === "DeaconHead" || user.departmentId === meeting.departmentId;
      }

      // 3. Subunit is visible to users in that subunit
      if (meeting.scope === "Subunit") {
        return (
          user.role === "SuperAdmin" ||
          user.role === "DeaconHead" ||
          (user.role === "DepartmentHead" && user.departmentId === meeting.departmentId) ||
          user.subunitId === meeting.subunitId
        );
      }

      return false;
    });

    const results = [];
    for (const meeting of filtered) {
      const attendance = await ctx.db
        .query("meetingAttendance")
        .withIndex("by_meeting_user", (q) => q.eq("meetingId", meeting._id).eq("userId", userId))
        .first();

      results.push({
        ...meeting,
        userAttendance: attendance ? {
          status: attendance.status,
          timestamp: attendance.timestamp,
          attendanceType: attendance.attendanceType,
          method: attendance.method,
          excuseReason: attendance.excuseReason,
          excuseDetail: attendance.excuseDetail,
          wellnessRating: attendance.wellnessRating,
          wellnessFeedback: attendance.wellnessFeedback,
        } : null,
      });
    }

    return results;
  },
});

export const getMeetingDetails = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) return null;

    // Check attendance status
    const attendance = await ctx.db
      .query("meetingAttendance")
      .withIndex("by_meeting_user", (q) => q.eq("meetingId", args.meetingId).eq("userId", userId))
      .first();

    return {
      ...meeting,
      userAttendance: attendance ? {
        status: attendance.status,
        timestamp: attendance.timestamp,
        attendanceType: attendance.attendanceType,
        method: attendance.method,
        excuseReason: attendance.excuseReason,
        excuseDetail: attendance.excuseDetail,
        wellnessRating: attendance.wellnessRating,
        wellnessFeedback: attendance.wellnessFeedback,
      } : null,
    };
  },
});

export const checkInToMeeting = mutation({
  args: {
    meetingId: v.id("meetings"),
    attendanceType: v.union(v.literal("physical"), v.literal("online")),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    accuracy: v.optional(v.number()),
    qrSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user || !user.churchId) throw new Error("User context not found");

    const churchId = user.churchId;
    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw new Error("Meeting not found");

    // Check if already checked in
    const existing = await ctx.db
      .query("meetingAttendance")
      .withIndex("by_meeting_user", (q) => q.eq("meetingId", args.meetingId).eq("userId", userId))
      .first();
    if (existing) {
      return existing._id;
    }

    const now = Date.now();

    // Verify time window
    const fifteenMins = 15 * 60 * 1000;
    const thirtyMins = 30 * 60 * 1000;
    
    if (now < meeting.startTime - fifteenMins) {
      throw new Error("Meeting check-in lobby is not open yet.");
    }
    if (now > meeting.endTime + thirtyMins) {
      throw new Error("Check-in window for this meeting has officially closed.");
    }

    // Scoping Authorization Validation
    if (meeting.scope === "Departmental") {
      if (user.role !== "SuperAdmin" && user.role !== "DeaconHead" && user.departmentId !== meeting.departmentId) {
        throw new Error("Unauthorized: You do not belong to the department hosting this meeting.");
      }
    } else if (meeting.scope === "Subunit") {
      if (
        user.role !== "SuperAdmin" &&
        user.role !== "DeaconHead" &&
        !(user.role === "DepartmentHead" && user.departmentId === meeting.departmentId) &&
        user.subunitId !== meeting.subunitId
      ) {
        throw new Error("Unauthorized: You do not belong to the subunit hosting this meeting.");
      }
    }

    let status: "Present" | "Late" | "Excused" = "Present";
    // Mark as Late if they check in 15 minutes or more after the start time
    if (now >= meeting.startTime + fifteenMins) {
      status = "Late";
    }

    let method: "QR" | "WebJoin" | "Manual" = "Manual";

    if (args.attendanceType === "online") {
      if (meeting.format === "Physical") {
        throw new Error("This is a physical-only meeting and does not support online check-in.");
      }
      method = "WebJoin";
    } else {
      // Physical check-in
      if (meeting.format === "Online") {
        throw new Error("This is an online-only meeting and does not support physical check-in.");
      }

      // 1. Verify QR Secret
      if (!args.qrSecret || args.qrSecret !== meeting.qrCodeSecret) {
        throw new Error("Invalid check-in code. Please scan a valid meeting QR code.");
      }

      // 2. Verify Geofence
      const churchDoc = await ctx.db.get(churchId);
      if (churchDoc?.location && args.lat && args.lng) {
        const distance = calculateDistance(
          args.lat,
          args.lng,
          churchDoc.location.lat,
          churchDoc.location.lng
        );
        const radius = churchDoc.settings?.geofenceRadius || 100;
        if (distance > radius) {
          throw new Error(`You are too far from the campus (${Math.round(distance)}m away) to check in physically.`);
        }
      }
      method = "QR";
    }

    // Insert attendance record
    const attendanceId = await ctx.db.insert("meetingAttendance", {
      meetingId: args.meetingId,
      userId,
      churchId,
      timestamp: now,
      attendanceType: args.attendanceType,
      status,
      method,
      location: args.lat && args.lng ? {
        lat: args.lat,
        lng: args.lng,
        accuracy: args.accuracy || 0,
      } : undefined,
    });

    return attendanceId;
  },
});

export const getMeetingAttendance = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    
    const records = await ctx.db
      .query("meetingAttendance")
      .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
      .collect();

    const results = [];
    for (const rec of records) {
      const user = await ctx.db.get(rec.userId);
      if (user) {
        results.push({
          ...rec,
          user: {
            name: user.name || "Unknown",
            email: user.email || "",
            image: user.image,
            role: user.role,
          },
        });
      }
    }
    return results;
  },
});

export const checkInUserManually = mutation({
  args: {
    meetingId: v.id("meetings"),
    targetUserId: v.id("users"),
    status: v.union(v.literal("Present"), v.literal("Late"), v.literal("Excused")),
    attendanceType: v.union(v.literal("physical"), v.literal("online")),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user || !["SuperAdmin", "DeaconHead", "PastoralOversight", "DepartmentHead", "SubunitLead"].includes(user.role || "")) {
      throw new Error("Unauthorized: Only leaders can manually check members in.");
    }

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser || !targetUser.churchId) throw new Error("Target user context not found");

    // Scoping check for leaders
    if (user.role === "DepartmentHead" && targetUser.departmentId !== user.departmentId) {
      throw new Error("Unauthorized: You can only check in users from your department.");
    }
    if (user.role === "SubunitLead" && targetUser.subunitId !== user.subunitId) {
      throw new Error("Unauthorized: You can only check in users from your subunit.");
    }

    const existing = await ctx.db
      .query("meetingAttendance")
      .withIndex("by_meeting_user", (q) => q.eq("meetingId", args.meetingId).eq("userId", args.targetUserId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        attendanceType: args.attendanceType,
        markedById: userId,
      });
      return existing._id;
    }

    return await ctx.db.insert("meetingAttendance", {
      meetingId: args.meetingId,
      userId: args.targetUserId,
      churchId: targetUser.churchId,
      timestamp: Date.now(),
      attendanceType: args.attendanceType,
      status: args.status,
      method: "Manual",
      markedById: userId,
    });
  },
});

export const lodgeMeetingExcuse = mutation({
  args: {
    meetingId: v.id("meetings"),
    reason: v.string(),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user || !user.churchId) throw new Error("User context not found");

    const meeting = await ctx.db.get(args.meetingId);
    if (!meeting) throw new Error("Meeting not found");

    // Scoping check for safety
    if (meeting.scope === "Departmental" && user.role !== "SuperAdmin" && user.role !== "DeaconHead" && user.departmentId !== meeting.departmentId) {
      throw new Error("Unauthorized: Meeting is out of your department scope.");
    }
    if (meeting.scope === "Subunit" && user.role !== "SuperAdmin" && user.role !== "DeaconHead" && user.subunitId !== meeting.subunitId && !(user.role === "DepartmentHead" && user.departmentId === meeting.departmentId)) {
      throw new Error("Unauthorized: Meeting is out of your subunit scope.");
    }

    const existing = await ctx.db
      .query("meetingAttendance")
      .withIndex("by_meeting_user", (q) => q.eq("meetingId", args.meetingId).eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "Excused",
        excuseReason: args.reason,
        excuseDetail: args.detail,
        timestamp: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("meetingAttendance", {
      meetingId: args.meetingId,
      userId,
      churchId: user.churchId,
      timestamp: Date.now(),
      attendanceType: "online",
      status: "Excused",
      method: "Manual",
      excuseReason: args.reason,
      excuseDetail: args.detail,
    });
  },
});

export const submitMeetingFeedback = mutation({
  args: {
    meetingId: v.id("meetings"),
    rating: v.number(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("meetingAttendance")
      .withIndex("by_meeting_user", (q) => q.eq("meetingId", args.meetingId).eq("userId", userId))
      .first();

    if (!existing) {
      throw new Error("Must be checked in (or marked absent/excused) to submit meeting feedback.");
    }

    await ctx.db.patch(existing._id, {
      wellnessRating: args.rating,
      wellnessFeedback: args.feedback,
    });
    return existing._id;
  },
});
