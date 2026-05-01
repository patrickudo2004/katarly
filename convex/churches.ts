import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

export const createChurch = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    address: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    location: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if slug is taken
    const existing = await ctx.db
      .query("churches")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) throw new Error("Church URL already taken");

    const churchId = await ctx.db.insert("churches", {
      name: args.name,
      slug: args.slug,
      address: args.address,
      logoStorageId: args.logoStorageId,
      superAdminId: userId,
      location: args.location,
    });

    // Seed default badges for the new church
    await ctx.db.insert("badges", {
      churchId,
      name: "3-Month Streak",
      description: "Served for 3 consecutive months",
      icon: "Flame",
      type: "milestone",
      requirementType: "streak",
      requirementValue: 12,
    });
    // (Adding more directly for efficiency in this mutation)

    await ctx.db.patch(userId, {
      churchId,
      role: "SuperAdmin",
      onboardingCompleted: true,
    });

    return churchId;
  },
});

export const getMyChurch = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user?.churchId) return null;

    const church = await ctx.db.get(user.churchId);
    if (church && !church.settings?.qrCodeSecret) {
      // In a real app, this should probably be a mutation, but for ease here:
      // We'll just return it for now or rely on a setup step.
      // Better: we'll check if we need to initialize it.
    }
    return church;
  },
});

export const initializeQrSecret = mutation({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user?.churchId) throw new Error("Church not found");

    const church = await ctx.db.get(user.churchId);
    if (church?.settings?.qrCodeSecret) return church.settings.qrCodeSecret;

    const secret = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15);
    
    await ctx.db.patch(user.churchId, {
      settings: {
        ...(church?.settings || {}),
        qrCodeSecret: secret,
      }
    });

    return secret;
  }
});

export const generateLogoUploadUrl = mutation({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateLogo = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user?.churchId || user.role !== "SuperAdmin") throw new Error("Unauthorized");

    const logoUrl = await ctx.storage.getUrl(args.storageId);
    if (!logoUrl) throw new Error("Failed to get URL for logo");

    await ctx.db.patch(user.churchId, {
      logoStorageId: args.storageId,
      logoUrl: logoUrl,
    });
  },
});

export const updateSettings = mutation({
  args: {
    attendanceWindowMinutes: v.optional(v.number()),
    geofenceRadius: v.optional(v.number()),
    requireLeadApprovalForSwaps: v.optional(v.boolean()),
    defaultQrType: v.optional(v.union(v.literal("Unique"), v.literal("Generic"))),
    location: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user?.churchId || user.role !== "SuperAdmin") {
      throw new Error("Unauthorized: Only SuperAdmins can update church settings");
    }

    const { location, ...settings } = args;
    const church = await ctx.db.get(user.churchId);
    if (!church) throw new Error("Church not found");

    await ctx.db.patch(user.churchId, {
      location: location ?? church.location,
      settings: {
        ...(church.settings || {}),
        ...settings,
      },
    });
  },
});

export const updateExtendedSettings = mutation({
  args: {
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    lateThresholdMinutes: v.optional(v.number()),
    autoCheckoutHours: v.optional(v.number()),
    burnoutLimitShiftsPerMonth: v.optional(v.number()),
    swapDeadlineHours: v.optional(v.number()),
    radiusUnit: v.optional(v.union(v.literal("meters"), v.literal("miles"))),
    accentColor: v.optional(v.string()),
    attendanceWindowMinutes: v.optional(v.number()),
    geofenceRadius: v.optional(v.number()),
    requireLeadApprovalForSwaps: v.optional(v.boolean()),
    defaultQrType: v.optional(v.union(v.literal("Unique"), v.literal("Generic"))),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user?.churchId || user.role !== "SuperAdmin") {
      throw new Error("Unauthorized");
    }

    const church = await ctx.db.get(user.churchId);
    if (!church) throw new Error("Church not found");

    const { name, address, lat, lng, ...settings } = args;

    await ctx.db.patch(user.churchId, {
      name: name ?? church.name,
      address: address ?? church.address,
      location: (lat !== undefined && lng !== undefined) ? { lat, lng } : church.location,
      settings: {
        ...(church.settings || {}),
        ...settings,
      },
    });
  },
});

export const getChurchStats = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user?.churchId) return null;

    const churchId = user.churchId;

    // 1. Total Volunteers
    const users = await ctx.db
      .query("users")
      .withIndex("by_church", (q) => q.eq("churchId", churchId))
      .collect();

    // 2. Avg. Attendance (Last 5 services)
    const services = await ctx.db
      .query("services")
      .withIndex("by_church_start_time", (q) => q.eq("churchId", churchId))
      .order("desc")
      .take(5);
    
    let totalRate = 0;
    if (services.length > 0) {
      for (const service of services) {
        const attended = await ctx.db
          .query("attendance")
          .withIndex("by_service", (q) => q.eq("serviceId", service._id))
          .filter((q) => q.eq(q.field("status"), "Present"))
          .collect();
        
        const rate = users.length > 0 ? (attended.length / users.length) * 100 : 0;
        totalRate += rate;
      }
    }
    const avgAttendance = services.length > 0 ? Math.round(totalRate / services.length) : 0;

    // 3. Upcoming Services
    const now = Date.now();
    const upcoming = await ctx.db
      .query("services")
      .withIndex("by_church", (q) => q.eq("churchId", churchId))
      .filter((q) => q.gt(q.field("startTime"), now))
      .collect();

    // 4. Pending Requests
    const swaps = await ctx.db
      .query("swapRequests")
      .withIndex("by_church_status", (q) => q.eq("churchId", churchId).eq("status", "available"))
      .collect();
    
    const pendingInvites = await ctx.db
      .query("invites")
      .withIndex("by_church_status", (q) => q.eq("churchId", churchId).eq("status", "pending"))
      .collect();

    // 5. Total Attendance Records
    const attendanceRecords = await ctx.db
      .query("attendance")
      .withIndex("by_church", (q) => q.eq("churchId", churchId))
      .collect();

    // 6. Total Subunits
    const subunits = await ctx.db
      .query("subunits")
      .withIndex("by_church", (q) => q.eq("churchId", churchId))
      .collect();

    // 7. Total Departments
    const depts = await ctx.db
      .query("departments")
      .withIndex("by_church", (q) => q.eq("churchId", churchId))
      .collect();

    return {
      totalVolunteers: users.length,
      avgAttendance,
      upcomingServices: upcoming.length,
      pendingRequests: swaps.length,
      pendingInvites: pendingInvites.length,
      nextService: upcoming[0] || null,
      totalAttendanceRecords: attendanceRecords.length,
      totalSubunits: subunits.length,
      totalDepartments: depts.length,
    };
  },
});

export const getRecentActivities = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    
    return await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(5);
  },
});

export const getAttendanceTrends = query({
  handler: async (ctx) => {
    try {
      const userId = await auth.getUserId(ctx);
      if (!userId) return [];
      const user = await ctx.db.get(userId);
      if (!user?.churchId) return [];

      const churchId = user.churchId;
      const now = Date.now();
      
      const services = await ctx.db
        .query("services")
        .withIndex("by_church_start_time", (q) => 
          q.eq("churchId", churchId).lt("startTime", now)
        )
        .order("desc")
        .take(8);
        
      if (!services || services.length === 0) return [];

      // Sort chronological (oldest to newest for trend chart)
      const sortedServices = [...services].sort((a, b) => a.startTime - b.startTime);
      
      const trends = [];
      
      for (const service of sortedServices) {
        if (!service) continue;
        
        const attendance = await ctx.db
          .query("attendance")
          .withIndex("by_service", (q) => q.eq("serviceId", service._id))
          .collect();
          
        let present = 0;
        let late = 0;
        let excused = 0;
        
        if (attendance) {
          attendance.forEach(a => {
            if (a.status === "Present") present++;
            else if (a.status === "Late") late++;
            else if (a.status === "Excused") excused++;
          });
        }
        
        const d = new Date(service.startTime);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const dateStr = `${months[d.getMonth()]} ${d.getDate()}`;

        trends.push({
          date: dateStr,
          name: service.name || "Unnamed Service",
          present,
          late,
          excused,
          total: present + late + excused
        });
      }
      
      return trends;
    } catch (error) {
      console.error("Error in getAttendanceTrends:", error);
      throw error; // Re-throw to show as Server Error but with details in logs
    }
  }
});

export const getOrganogram = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user?.churchId) return null;

    const church = await ctx.db.get(user.churchId);
    if (!church) return null;

    const allUsers = await ctx.db
      .query("users")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId))
      .collect();

    const depts = await ctx.db
      .query("departments")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId))
      .collect();

    const subunits = await ctx.db
      .query("subunits")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId))
      .collect();
    
    return {
      id: church._id,
      name: church.name,
      role: "SuperAdmin" as const,
      children: depts.map(dept => ({
        id: dept._id,
        name: dept.name,
        role: "DepartmentHead" as const,
        headId: dept.headId,
        assistantId: dept.assistantId,
        children: subunits
          .filter(s => s.departmentId === dept._id)
          .map(s => ({
            id: s._id,
            name: s.name,
            role: "SubunitLead" as const,
            headId: s.leadId,
            assistantId: s.assistantId,
            children: allUsers
              .filter(u => u.subunitId === s._id)
              .map(u => ({
                id: u._id,
                name: u.name || u.email || "Unknown Volunteer",
                role: u.role as any,
              }))
          }))
      }))
    };
  },
});
