import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { auth } from "./auth";
import { getUserBorrowedDepartmentIds, isGlobalAdmin } from "./utils";

export const createRotaEntry = mutation({
  args: {
    serviceId: v.id("services"),
    departmentId: v.id("departments"),
    subunitId: v.optional(v.id("subunits")),
    userId: v.optional(v.id("users")), // Optional for open shifts
    role: v.string(),
    allowCrossDept: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user?.churchId) throw new Error("User has no church");
    
    // Auth: Scoped permissions
    if (user.role === "SuperAdmin" || isGlobalAdmin(user.role)) {
      // Full access
    } else if (user.role === "DepartmentHead" || user.role === "DepartmentAssistant") {
      if (args.departmentId !== user.departmentId) {
        throw new Error("Unauthorized: You can only assign shifts within your own department.");
      }
    } else if (user.role === "SubunitLead" || user.role === "SubunitAssistant") {
      // Must match BOTH their department AND their subunit
      if (args.departmentId !== user.departmentId) {
        throw new Error("Unauthorized: You can only assign shifts within your own department.");
      }
      if (args.subunitId !== user.subunitId) {
        throw new Error("Unauthorized: You can only assign shifts within your own subunit.");
      }
    } else {
      throw new Error("Unauthorized to assign shifts");
    }

    if (args.userId) {
      // 1. Conflict Check: Double Booking
      const existingEntry = await ctx.db
        .query("rotas")
        .withIndex("by_user", (q) => q.eq("userId", args.userId as any))
        .filter((q) => q.eq(q.field("serviceId"), args.serviceId))
        .first();

      if (existingEntry) {
        throw new Error("Volunteer is already scheduled for this service.");
      }

      // 2. Conflict Check: Time Off
      const service = await ctx.db.get(args.serviceId);
      if (!service) throw new Error("Service not found");

      const timeOffRequests = await ctx.db
        .query("timeOffRequests")
        .withIndex("by_user", (q) => q.eq("userId", args.userId as any))
        .filter((q) => q.eq(q.field("status"), "Approved"))
        .collect();

      const isOnLeave = timeOffRequests.some(
        (req) => service.startTime >= req.startDate && service.startTime <= req.endDate
      );

      if (isOnLeave) {
        throw new Error("Volunteer is on approved leave during this service.");
      }
    }

    return await ctx.db.insert("rotas", {
      serviceId: args.serviceId,
      departmentId: args.departmentId,
      subunitId: args.subunitId,
      userId: args.userId,
      role: args.role,
      status: "Pending",
      allowCrossDept: args.allowCrossDept,
    });
  },
});

export const removeRotaEntry = mutation({
  args: { rotaId: v.id("rotas") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    
    // Auth: Only Leads or Admins can remove
    if (user?.role === "Volunteer") throw new Error("Unauthorized");

    const rota = await ctx.db.get(args.rotaId);
    if (!rota) throw new Error("Rota entry not found");
    const dept = await ctx.db.get(rota.departmentId);
    if (!dept || dept.churchId !== user?.churchId) {
      throw new Error("Unauthorized: Cross-church mutation blocked");
    }

    await ctx.db.delete(args.rotaId);
  },
});

export const getRotaForRange = query({
  args: {
    startDate: v.number(), // Timestamp of start of week
    endDate: v.number(),   // Timestamp of end of week
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.churchId) return [];

    // 1. Get all services in the range for this church
    const services = await ctx.db
      .query("services")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId))
      .filter((q) => q.and(
        q.gte(q.field("startTime"), args.startDate),
        q.lte(q.field("startTime"), args.endDate)
      ))
      .collect();

    const serviceIds = services.map(s => s._id);

    // 2. Get all rota entries for these services
    const results = [];
    for (const serviceId of serviceIds) {
      const entries = await ctx.db
        .query("rotas")
        .withIndex("by_service", (q) => q.eq("serviceId", serviceId))
        .collect();

      const serviceDetail = services.find(s => s._id === serviceId);

      for (const entry of entries) {
        const attendee = entry.userId ? await ctx.db.get(entry.userId) : null;
        const department = await ctx.db.get(entry.departmentId);
        const subunit = entry.subunitId ? await ctx.db.get(entry.subunitId) : null;
        
        results.push({
          ...entry,
          userName: attendee?.name || attendee?.email || "Unassigned",
          userRole: attendee?.role || "N/A",
          position: entry.role,
          date: serviceDetail?.startTime,
          serviceName: serviceDetail?.name,
          departmentName: department?.name,
          subunitName: subunit?.name,
        });
      }
    }

    return results;
  },
});

export const getCoverageStats = query({
  args: {
    year: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.churchId) return [];

    const startOfYear = new Date(args.year, 0, 1).getTime();
    const endOfYear = new Date(args.year, 11, 31, 23, 59, 59, 999).getTime();

    // 1. Get all services for the year
    const services = await ctx.db
      .query("services")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId))
      .filter((q) => q.and(
        q.gte(q.field("startTime"), startOfYear),
        q.lte(q.field("startTime"), endOfYear)
      ))
      .collect();

    // 2. For each service, count rotas
    const stats = await Promise.all(services.map(async (s) => {
      const entries = await ctx.db
        .query("rotas")
        .withIndex("by_service", (q) => q.eq("serviceId", s._id))
        .collect();

      return {
        date: s.startTime,
        serviceId: s._id,
        filled: entries.length,
        // Mock requirement: 3+ for full coverage for now
        status: entries.length === 0 ? 'empty' : entries.length < 3 ? 'partial' : 'full'
      };
    }));

    return stats;
  },
});

export const getServiceRota = query({
  args: { serviceId: v.id("services") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("rotas")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .collect();

    return await Promise.all(entries.map(async (e) => {
      const user = e.userId ? await ctx.db.get(e.userId) : null;
      const department = await ctx.db.get(e.departmentId);
      const subunit = e.subunitId ? await ctx.db.get(e.subunitId) : null;
      return { 
        ...e, 
        userName: user?.name, 
        userEmail: user?.email,
        departmentName: department?.name,
        subunitName: subunit?.name
      };
    }));
  },
});

export const getMyShifts = query({
  args: {
    upcomingOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];

    const shifts = await ctx.db
      .query("rotas")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Join with service details
    let enriched = await Promise.all(
      shifts.map(async (shift) => {
        const service = await ctx.db.get(shift.serviceId);
        const department = await ctx.db.get(shift.departmentId);
        const subunit = shift.subunitId ? await ctx.db.get(shift.subunitId) : null;
        return { ...shift, service, department, subunit };
      })
    );

    // Filter out records where services were deleted from DB (safety)
    enriched = enriched.filter(e => e.service !== null);

    const now = Date.now();
    if (args.upcomingOnly) {
      // Keep shifts starting in the future, or active shifts starting up to 2 hours ago
      enriched = enriched.filter(e => (e.service?.startTime ?? 0) >= now - 2 * 60 * 60 * 1000);
      // Sort chronologically (closest first)
      enriched.sort((a, b) => (a.service?.startTime ?? 0) - (b.service?.startTime ?? 0));
    } else {
      // Sort reverse-chronological (most recent first) for history ledger
      enriched.sort((a, b) => (b.service?.startTime ?? 0) - (a.service?.startTime ?? 0));
    }

    if (args.limit) {
      enriched = enriched.slice(0, args.limit);
    }

    return enriched;
  },
});


export const getOpenShifts = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    
    // We fetch rotas and filter manually because we cannot index on undefined/missing fields easily in convex
    const allRotas = await ctx.db.query("rotas").collect();
    const openRotas = allRotas.filter(r => !r.userId);

    const user = await ctx.db.get(userId);
    if (!user) return [];

    // Join with services, subunits, and filter by church/department/borrow status
    const enriched = await Promise.all(
      openRotas.map(async (rota) => {
        const service = await ctx.db.get(rota.serviceId);
        if (!service || service.churchId !== user.churchId) return null;

        // Temporal Lockout: Must not start in less than 2 hours
        const cutoff = Date.now() + 2 * 60 * 60 * 1000;
        if (service.startTime < cutoff) return null;

        const department = await ctx.db.get(rota.departmentId);
        const subunit = rota.subunitId ? await ctx.db.get(rota.subunitId) : null;

        // Global admin bypass
        const isGlobalAdmin = ["SuperAdmin", "DeaconHead", "PastoralOversight"].includes(user.role || "");
        if (isGlobalAdmin) {
          return { ...rota, service, department, subunit };
        }

        // Scoping Logic:
        // 1. If global / cross-department is allowed, everyone in the church can see it
        if (rota.allowCrossDept === true) {
          return { ...rota, service, department, subunit };
        }

        // 2. Otherwise, check if user is in the department (primary or borrowed)
        const borrowedDeptIds = await getUserBorrowedDepartmentIds(ctx, user._id, service.startTime);
        const isUserInDept = rota.departmentId === user.departmentId || borrowedDeptIds.includes(rota.departmentId);

        if (!isUserInDept) return null;

        // 3. If rota has subunit, user must match primary subunit (unless they are borrowed into the department)
        const isBorrowedInDept = borrowedDeptIds.includes(rota.departmentId);
        if (rota.subunitId && !isBorrowedInDept && rota.subunitId !== user.subunitId) {
          // Check if it matches additionalSubunits
          const isAdditional = (user.additionalSubunits || []).includes(rota.subunitId.toString());
          if (!isAdditional) return null;
        }

        return { ...rota, service, department, subunit };
      })
    );

    // Filter out nulls and sort by date
    return enriched
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => (a.service?.startTime || 0) - (b.service?.startTime || 0));
  },
});

export const assignUserToShift = mutation({
  args: {
    rotaId: v.id("rotas"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const adminId = await auth.getUserId(ctx);
    if (!adminId) throw new Error("Not authenticated");
    const admin = await ctx.db.get(adminId);
    if (!admin) throw new Error("Admin not found");

    const rota = await ctx.db.get(args.rotaId);
    if (!rota) throw new Error("Rota entry not found");

    const service = await ctx.db.get(rota.serviceId);
    if (!service) throw new Error("Service not found");

    const userToAssign = await ctx.db.get(args.userId);
    if (!userToAssign || userToAssign.churchId !== admin.churchId) {
      throw new Error("Unauthorized: Target user belongs to a different church");
    }
    if (service.churchId !== admin.churchId) {
      throw new Error("Unauthorized: Cross-church operation blocked");
    }

    // Lockout Check (< 2 hours)
    const now = Date.now();
    if (service.startTime - now < 2 * 60 * 60 * 1000) {
      throw new Error("Service starts in less than 2 hours. Roster changes are locked. Please coordinate directly.");
    }
    
    // Auth: Scoped permissions
    if (admin.role === "SuperAdmin") {
      // Full access
    } else if (admin.role === "DeaconHead" || admin.role === "DepartmentHead" || admin.role === "DepartmentAssistant" || admin.role === "PastoralOversight") {
      if (rota.departmentId !== admin.departmentId) {
        throw new Error("Unauthorized: You can only assign shifts within your own department.");
      }
    } else if (admin.role === "SubunitLead" || admin.role === "SubunitAssistant") {
      if (rota.subunitId !== admin.subunitId) {
        throw new Error("Unauthorized: You can only assign shifts within your own subunit.");
      }
    } else {
      throw new Error("Unauthorized");
    }

    // 1. Conflict Check: Double Booking (Is user already scheduled for THIS specific service?)
    const existingEntry = await ctx.db
      .query("rotas")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("serviceId"), rota.serviceId))
      .first();

    if (existingEntry && existingEntry._id !== args.rotaId) {
      throw new Error("Volunteer is already scheduled for this service.");
    }

    // 2. Conflict Check: Time Off
    const timeOffRequests = await ctx.db
      .query("timeOffRequests")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "Approved"))
      .collect();

    const isOnLeave = timeOffRequests.some(
      (req) => service.startTime >= req.startDate && service.startTime <= req.endDate
    );

    if (isOnLeave) {
      throw new Error("Volunteer is on approved leave during this service.");
    }

    await ctx.db.patch(args.rotaId, {
      userId: args.userId,
      status: "Pending", // Reset status to pending when reassigned
    });

    // Send Email Notification
    try {
      const user = await ctx.db.get(args.userId);
      if (user && user.email && user.emailNotificationsEnabled !== false) {
        const pref = user.emailPreferences?.shiftAssignments !== false;
        if (pref) {
          const isPriority = service.startTime - now < 24 * 60 * 60 * 1000;
          const subject = isPriority 
            ? `[URGENT] Shift Assignment: Rota updated for service starting soon` 
            : `[ServeSync] New Shift Assignment: ${service.name}`;
          const title = isPriority ? `Urgent Shift Assignment! 🚨` : `New Shift Assignment! 📅`;
          const body = isPriority 
            ? `You have been assigned to cover the role of "${rota.role}" for the service "${service.name}" starting in less than 24 hours. Please verify your availability.`
            : `You have been scheduled for the role of "${rota.role}" for the service "${service.name}".`;

          await ctx.scheduler.runAfter(0, api.emails.sendNotificationEmail, {
            toEmail: user.email,
            toName: user.name || "Steward",
            subject,
            title,
            body,
            actionUrl: `${process.env.SITE_URL || "https://servesync-pi.vercel.app"}/rota`,
            actionText: "View Schedule",
          });
        }
      }
    } catch (err) {
      console.error("Failed to dispatch assignment email:", err);
    }

    return args.rotaId;
  },
});

export const confirmShift = mutation({
  args: { rotaId: v.id("rotas") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const rota = await ctx.db.get(args.rotaId);
    if (!rota) throw new Error("Rota entry not found");

    if (rota.userId !== userId) {
      throw new Error("Unauthorized: You can only confirm shifts assigned to you.");
    }

    await ctx.db.patch(args.rotaId, {
      status: "Confirmed",
    });

    return args.rotaId;
  },
});



