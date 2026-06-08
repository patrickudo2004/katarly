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

// Helper: Calculate consecutive weeks served (descending order)
function getConsecutiveWeeksServed(records: any[]) {
  if (records.length === 0) return 0;
  
  // Extract unique Sunday start-of-week timestamps
  const weekStartTimes = Array.from(
    new Set(
      records.map((r) => {
        const d = new Date(r.timestamp);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - d.getDay()); // Sunday
        return d.getTime();
      })
    )
  ).sort((a, b) => b - a);

  if (weekStartTimes.length === 0) return 0;

  const now = Date.now();
  const currentSunday = new Date();
  currentSunday.setHours(0, 0, 0, 0);
  currentSunday.setDate(currentSunday.getDate() - currentSunday.getDay());
  const currentSundayTime = currentSunday.getTime();

  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  
  // If no shift in past 2 weeks, streak is broken
  if (currentSundayTime - weekStartTimes[0] > oneWeekMs * 2) {
    return 0;
  }

  let streak = 0;
  let expectedWeek = weekStartTimes[0];
  
  for (const week of weekStartTimes) {
    if (expectedWeek - week > oneWeekMs) {
      break;
    }
    streak++;
    expectedWeek = week;
  }

  return streak;
}

// 1. Volunteer Burnout & Wellness alerts
export const getBurnoutAlerts = query({
  args: {
    departmentId: v.optional(v.union(v.id("departments"), v.null())),
    subunitId: v.optional(v.union(v.id("subunits"), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user.churchId) return [];

    const userRole = user.role || "";
    const deptRoles = ["DeaconHead", "PastoralOversight", "DepartmentHead", "DepartmentAssistant", "DepartmentSecretary"];
    const subunitRoles = ["SubunitLead", "SubunitAssistant"];
    const allowedRoles = ["SuperAdmin", ...deptRoles, ...subunitRoles];

    if (!allowedRoles.includes(userRole)) {
      throw new Error("Unauthorized");
    }

    // Determine target boundaries based on role
    let finalDeptId: string | null = args.departmentId || null;
    let finalSubunitId: string | null = args.subunitId || null;

    if (deptRoles.includes(userRole)) {
      if (!user.departmentId) return [];
      finalDeptId = user.departmentId;
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
    }

    const church = (await ctx.db.get(user.churchId)) as any;
    if (!church) return [];
    
    const enableAlerts = church.settings?.enableBurnoutAlerts ?? true;
    if (!enableAlerts) return [];

    const shiftsLimit = church.settings?.burnoutLimitShiftsPerMonth ?? 8;
    const consecutiveLimit = church.settings?.burnoutLimitConsecutiveSundays ?? 4;

    // Fetch active users in scope
    let usersQuery = ctx.db
      .query("users")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId!));
    
    if (finalSubunitId) {
      usersQuery = usersQuery.filter(q => q.eq(q.field("subunitId"), finalSubunitId as any));
    } else if (finalDeptId) {
      usersQuery = usersQuery.filter(q => q.eq(q.field("departmentId"), finalDeptId as any));
    }

    const scopedUsers = await usersQuery.collect();
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const alerts = [];

    for (const u of scopedUsers) {
      // Skip SuperAdmin or other non-volunteering roles
      if (u.role === "SuperAdmin" || u.role === "DeaconHead") continue;

      const userAttendance = await ctx.db
        .query("attendance")
        .withIndex("by_user", (q) => q.eq("userId", u._id))
        .collect();

      const shiftsThisMonth = userAttendance.filter(a => a.timestamp >= thirtyDaysAgo).length;
      const consecutiveWeeks = getConsecutiveWeeksServed(userAttendance);

      const reasons = [];
      if (shiftsThisMonth > shiftsLimit) {
        reasons.push(`Exceeded Monthly Limit (${shiftsThisMonth}/${shiftsLimit} shifts)`);
      }
      if (consecutiveWeeks > consecutiveLimit) {
        reasons.push(`Served ${consecutiveWeeks} consecutive Sundays (Limit: ${consecutiveLimit})`);
      }

      if (reasons.length > 0) {
        const dept = u.departmentId ? await ctx.db.get(u.departmentId) : null;
        const sub = u.subunitId ? await ctx.db.get(u.subunitId) : null;
        alerts.push({
          userId: u._id,
          name: u.name || u.email || "Unknown",
          departmentName: dept?.name || "None",
          subunitName: sub?.name || "None",
          shiftsCount: shiftsThisMonth,
          consecutiveWeeks,
          reasons,
          riskLevel: (shiftsThisMonth > shiftsLimit + 2 || consecutiveWeeks > consecutiveLimit + 1) ? "high" : "medium"
        });
      }
    }

    return alerts;
  },
});

// 2. Safeguarding & Compliance Audit Trail
export const getSafeguardingAudit = query({
  args: {
    departmentId: v.optional(v.union(v.id("departments"), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user.churchId) return [];

    const userRole = user.role || "";
    const deptRoles = ["DeaconHead", "PastoralOversight", "DepartmentHead", "DepartmentAssistant", "DepartmentSecretary"];
    const allowedRoles = ["SuperAdmin", ...deptRoles];

    if (!allowedRoles.includes(userRole)) {
      throw new Error("Unauthorized: Insufficient permissions for safeguarding logs.");
    }

    let finalDeptId = args.departmentId || null;
    if (deptRoles.includes(userRole)) {
      if (!user.departmentId) return [];
      finalDeptId = user.departmentId;
    }

    let query = ctx.db
      .query("attendance")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId!))
      .order("desc");

    if (finalDeptId) {
      query = query.filter(q => q.eq(q.field("departmentId"), finalDeptId as any));
    }

    const records = await query.take(200);

    return Promise.all(
      records.map(async (r) => {
        const volunteer = await ctx.db.get(r.userId);
        const service = await ctx.db.get(r.serviceId);
        const department = r.departmentId ? await ctx.db.get(r.departmentId) : null;
        const supervisor = r.markedById ? await ctx.db.get(r.markedById) : null;

        // Verify background check via skills array or role status
        const isApproved = volunteer?.skills?.includes("Safeguarding Approved") || 
                            volunteer?.skills?.includes("Background Checked") || 
                            false;

        return {
          id: r._id,
          volunteerName: volunteer?.name || volunteer?.email || "Unknown",
          serviceName: service?.name || "Unknown",
          departmentName: department?.name || "None",
          timestamp: r.timestamp,
          status: r.status,
          method: r.method,
          verifiedBy: supervisor?.name || supervisor?.email || "Self (Auto QR)",
          hasBackgroundCheck: isApproved,
          locationAccuracy: r.location ? `${r.location.accuracy.toFixed(1)}m` : "No GPS",
        };
      })
    );
  },
});

// 3. Daily rankings calculation mutation (Cached statistics for DBA optimization)
export const calculateDailySubunitStats = mutation({
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "SuperAdmin") throw new Error("Unauthorized");

    const subunits = await ctx.db
      .query("subunits")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId!))
      .collect();

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    for (const sub of subunits) {
      // Find all check-ins for this subunit in the past 30 days
      const attendance = await ctx.db
        .query("attendance")
        .withIndex("by_church", (q) => q.eq("churchId", user.churchId!))
        .filter((q) => q.and(
          q.eq(q.field("subunitId"), sub._id),
          q.gte(q.field("timestamp"), thirtyDaysAgo)
        ))
        .collect();

      const totalRecords = attendance.length;
      if (totalRecords === 0) continue;

      const present = attendance.filter(a => a.status === "Present").length;
      const late = attendance.filter(a => a.status === "Late").length;
      const consistencyScore = Math.round(((present + late) / totalRecords) * 100);

      // Average lateness calculation
      // Mock average lateness based on status (lates average 20 mins, presents average 2 mins)
      const totalLateness = (late * 20) + (present * 2);
      const avgLateness = Math.round(totalLateness / totalRecords);

      const dept = await ctx.db.get(sub.departmentId);

      // Determine trend compared to existing record
      const existing = await ctx.db
        .query("subunitStats")
        .withIndex("by_church", q => q.eq("churchId", user.churchId!))
        .filter(q => q.eq(q.field("subunitId"), sub._id))
        .first();

      let trend: "up" | "down" | "stable" = "stable";
      if (existing) {
        if (consistencyScore > existing.consistencyScore) trend = "up";
        else if (consistencyScore < existing.consistencyScore) trend = "down";
      }

      if (existing) {
        await ctx.db.patch(existing._id, {
          consistencyScore,
          avgLatenessMinutes: avgLateness,
          trend,
          lastCalculatedAt: now,
        });
      } else {
        await ctx.db.insert("subunitStats", {
          churchId: user.churchId!,
          subunitId: sub._id,
          subunitName: sub.name,
          departmentId: sub.departmentId,
          departmentName: dept?.name || "Unknown",
          consistencyScore,
          avgLatenessMinutes: avgLateness,
          trend,
          lastCalculatedAt: now,
        });
      }
    }
  },
});

// 4. Retrieve Leaderboard Rankings
export const getSubunitLeaderboards = query({
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user.churchId) return [];

    const stats = await ctx.db
      .query("subunitStats")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId!))
      .collect();

    // Sort by consistencyScore descending
    return stats.sort((a, b) => b.consistencyScore - a.consistencyScore);
  },
});

// 5. Live Floor Coverage Grid
export const getLiveFloorCoverage = query({
  args: {
    departmentId: v.optional(v.union(v.id("departments"), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user.churchId) return [];

    const userRole = user.role || "";
    const deptRoles = ["DeaconHead", "PastoralOversight", "DepartmentHead", "DepartmentAssistant", "DepartmentSecretary"];
    const allowedRoles = ["SuperAdmin", ...deptRoles, "SubunitLead", "SubunitAssistant"];

    if (!allowedRoles.includes(userRole)) {
      throw new Error("Unauthorized");
    }

    let finalDeptId = args.departmentId || null;
    if (deptRoles.includes(userRole)) {
      if (!user.departmentId) return [];
      finalDeptId = user.departmentId;
    }

    const now = Date.now();
    
    // Find active services today (started within last 3 hours or starting in next hour)
    const activeServices = await ctx.db
      .query("services")
      .withIndex("by_church_start_time", (q) => q.eq("churchId", user.churchId!))
      .filter((q) => q.and(
        q.gte(q.field("startTime"), now - 3 * 60 * 60 * 1000),
        q.lte(q.field("startTime"), now + 1 * 60 * 60 * 1000)
      ))
      .collect();

    if (activeServices.length === 0) return [];

    const liveCoverage = [];

    // Query subunits for coverage
    let subunitsQuery = ctx.db
      .query("subunits")
      .withIndex("by_church", q => q.eq("churchId", user.churchId!));
    
    if (finalDeptId) {
      subunitsQuery = subunitsQuery.filter(q => q.eq(q.field("departmentId"), finalDeptId as any));
    } else if (user.subunitId) {
      subunitsQuery = subunitsQuery.filter(q => q.eq(q.field("_id"), user.subunitId as any));
    }

    const targetSubunits = await subunitsQuery.collect();

    for (const sub of targetSubunits) {
      let scheduledCount = 0;
      let checkedInCount = 0;

      for (const service of activeServices) {
        // Count scheduled in rota
        const scheduled = await ctx.db
          .query("rotas")
          .withIndex("by_service", (q) => q.eq("serviceId", service._id))
          .filter(q => q.eq(q.field("subunitId"), sub._id))
          .collect();
        scheduledCount += scheduled.length;

        // Count checked in
        const checkedIn = await ctx.db
          .query("attendance")
          .withIndex("by_service", (q) => q.eq("serviceId", service._id))
          .filter(q => q.eq(q.field("subunitId"), sub._id))
          .collect();
        checkedInCount += checkedIn.length;
      }

      // Default required to at least 4 if scheduled is 0 for demo purposes
      const required = Math.max(scheduledCount, 4);
      let status: "red" | "amber" | "green" = "green";
      const ratio = checkedInCount / required;

      if (ratio < 0.5) status = "red";
      else if (ratio < 0.85) status = "amber";

      const dept = await ctx.db.get(sub.departmentId);

      liveCoverage.push({
        subunitId: sub._id,
        subunitName: sub.name,
        departmentName: dept?.name || "None",
        checkedIn: checkedInCount,
        required,
        status,
      });
    }

    return liveCoverage;
  },
});

// 6. Probation Rehabilitation and Graduation Tracker
export const getProbationStatusList = query({
  args: {
    departmentId: v.optional(v.union(v.id("departments"), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user.churchId) return [];

    const userRole = user.role || "";
    const allowedRoles = ["SuperAdmin", "DeaconHead", "PastoralOversight", "DepartmentHead", "DepartmentAssistant"];
    if (!allowedRoles.includes(userRole)) {
      throw new Error("Unauthorized");
    }

    let finalDeptId = args.departmentId || null;
    if (userRole !== "SuperAdmin" && user.departmentId) {
      finalDeptId = user.departmentId;
    }

    // Query active users on probation
    let probationUsersQuery = ctx.db
      .query("users")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId!))
      .filter((q) => q.and(
        q.eq(q.field("status"), "active"),
        q.eq(q.field("role"), "Probation")
      ));

    if (finalDeptId) {
      probationUsersQuery = probationUsersQuery.filter(q => q.eq(q.field("departmentId"), finalDeptId as any));
    }

    const probationUsers = await probationUsersQuery.collect();
    const resultList = [];

    for (const u of probationUsers) {
      // Calculate attendance score in past 30 days
      const userAttendance = await ctx.db
        .query("attendance")
        .withIndex("by_user", (q) => q.eq("userId", u._id))
        .collect();

      // Consecutive on-time shifts streak
      let streak = 0;
      const sortedAttendance = userAttendance.sort((a, b) => b.timestamp - a.timestamp);
      for (const att of sortedAttendance) {
        if (att.status === "Present") {
          streak++;
        } else if (att.status === "Late") {
          break; // Streak broken by lateness
        }
      }

      // Fetch latest remark
      const latestRemark = await ctx.db
        .query("probationRemarks")
        .withIndex("by_user", (q) => q.eq("userId", u._id))
        .order("desc")
        .first();

      const requiredStreak = 8; // Graduate after 8 on-time shifts in a row
      const isGraduationReady = streak >= requiredStreak && (!latestRemark || latestRemark.sentiment !== "Concern");

      const dept = u.departmentId ? await ctx.db.get(u.departmentId) : null;
      const sub = u.subunitId ? await ctx.db.get(u.subunitId) : null;

      resultList.push({
        userId: u._id,
        name: u.name || u.email || "Unknown",
        departmentName: dept?.name || "None",
        subunitName: sub?.name || "None",
        streakCount: streak,
        requiredStreak,
        lastRemark: latestRemark?.content || "No remarks logged yet",
        remarkSentiment: latestRemark?.sentiment || "Fair",
        remarkDate: latestRemark?.timestamp,
        isGraduationReady,
      });
    }

    return resultList;
  },
});
