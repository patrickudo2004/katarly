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
      // Non-SuperAdmins can only schedule for their own department
      if (user.role !== "SuperAdmin" && user.departmentId !== args.departmentId) {
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

    return await ctx.db.insert("meetings", {
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
        return user.role === "SuperAdmin" || user.departmentId === meeting.departmentId;
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
      throw new Error("Meeting has not opened for check-in yet.");
    }
    if (now > meeting.endTime + thirtyMins) {
      throw new Error("Check-in window for this meeting is closed.");
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
      status: "Present",
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
