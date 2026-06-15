import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

async function getAuthenticatedUser(ctx: any) {
  const userId = await auth.getUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  return user as any;
}

export const getNfcConfig = query({
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user.churchId) return null;

    const church = (await ctx.db.get(user.churchId)) as any;
    if (!church) return null;

    // Only management can see the full config
    const isManagement = ["SuperAdmin", "DeaconHead", "DepartmentHead", "PastoralOversight"].includes(user.role || "");
    if (!isManagement) return null;

    return {
      churchId: church._id,
      churchName: church.name,
      nfcSecret: church.settings?.nfcSecret,
      autoCheckin: church.settings?.nfcAutoCheckinEnabled ?? true,
      baseUrl: process.env.VITE_APP_URL || "https://servesync-pi.vercel.app",
    };
  },
});

export const initializeNfc = mutation({
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "SuperAdmin") throw new Error("Only SuperAdmins can initialize NFC");
    if (!user.churchId) throw new Error("Church not found");

    const church = (await ctx.db.get(user.churchId)) as any;
    if (!church) throw new Error("Church not found");

    if (church.settings?.nfcSecret) return church.settings.nfcSecret;

    // Generate a random 4-byte hex (8 chars)
    const secret = Math.random().toString(16).substring(2, 10).toUpperCase();

    await ctx.db.patch(user.churchId, {
      settings: {
        ...(church.settings || {}),
        nfcSecret: secret,
        nfcAutoCheckinEnabled: true,
      }
    });

    return secret;
  },
});

export const validateTap = mutation({
  args: {
    churchId: v.id("churches"),
    lat: v.number(),
    lng: v.number(),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const church = await ctx.db.get(args.churchId);
    if (!church) throw new Error("Church not found");

    // 1. Secret Validation (Simple anti-spoof)
    if (church.settings?.nfcSecret !== args.secret) {
      throw new Error("Invalid NFC Tag Secret");
    }

    // 2. Geofence Validation
    if (church.location) {
      const distance = calculateDistance(
        args.lat,
        args.lng,
        church.location.lat,
        church.location.lng
      );
      
      const radius = church.settings?.geofenceRadius || 200; // Default 200m
      if (distance > radius) {
        throw new Error("You must be at the church to check in.");
      }
    }

    // 3. Trigger Attendance Logic
    // We import the logic from attendance or just call the mutation directly if possible
    // Since we are in Convex, we can't "call" another mutation easily without duplicating logic
    // or using a shared internal function. Let's assume we have a shared helper.
    
    // For now, we'll return success and let the frontend call the actual check-in 
    // OR we implement the check-in here to ensure it's "Atomic".
    
    // Let's implement the core check-in logic here to ensure security
    const now = Date.now();
    const service = await ctx.db
      .query("services")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .filter((q) => 
        q.and(
          q.lt(q.field("startTime"), now + 60 * 60 * 1000), // Within 1 hour
          q.gt(q.field("startTime"), now - 120 * 60 * 1000) // Not more than 2 hours ago
        )
      )
      .first();

    if (!service) throw new Error("No active service found for check-in.");

    // Check if already checked in
    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_service", (q) => q.eq("serviceId", service._id))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (existing) return { status: "already_present", serviceName: service.name };

    // Log attendance
    const isLate = now > service.startTime + (church.settings?.lateThresholdMinutes || 15) * 60 * 1000;
    
    await ctx.db.insert("attendance", {
      userId: user._id,
      serviceId: service._id,
      churchId: args.churchId,
      timestamp: now,
      status: isLate ? "Late" : "Present",
      method: "nfc",
    });

    return { 
      status: "success", 
      serviceName: service.name, 
      isLate,
      pointsEarned: isLate ? 5 : 15 
    };
  },
});

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
