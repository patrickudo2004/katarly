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
          requiresSafeguarding: department?.requiresSafeguarding ?? false,
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

export const getMeetingAnalytics = query({
  args: {
    rangeDays: v.number(),
    departmentId: v.optional(v.union(v.id("departments"), v.null())),
    subunitId: v.optional(v.union(v.id("subunits"), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user.churchId) return null;

    const userRole = user.role || "";
    const deptRoles = ["DeaconHead", "PastoralOversight", "DepartmentHead", "DepartmentAssistant", "DepartmentSecretary"];
    const subunitRoles = ["SubunitLead", "SubunitAssistant"];
    const allowedRoles = ["SuperAdmin", ...deptRoles, ...subunitRoles];

    if (!allowedRoles.includes(userRole)) {
      throw new Error("Unauthorized");
    }

    let finalDeptId: string | null = args.departmentId || null;
    let finalSubunitId: string | null = args.subunitId || null;

    if (deptRoles.includes(userRole)) {
      if (!user.departmentId) return null;
      finalDeptId = user.departmentId;
      if (finalSubunitId) {
        const subunit = (await ctx.db.get(finalSubunitId as any)) as any;
        if (!subunit || subunit.departmentId !== finalDeptId) {
          finalSubunitId = null;
        }
      }
    } else if (subunitRoles.includes(userRole)) {
      if (!user.subunitId) return null;
      finalSubunitId = user.subunitId;
      finalDeptId = user.departmentId || null;
    }

    const startTimeLimit = Date.now() - (args.rangeDays * 24 * 60 * 60 * 1000);
    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_church_start_time", (q) => q.eq("churchId", user.churchId).gt("startTime", startTimeLimit))
      .collect();

    const filteredMeetings = meetings.filter((m) => {
      if (finalSubunitId) return m.subunitId === finalSubunitId;
      if (finalDeptId) return m.departmentId === finalDeptId;
      return true;
    });

    const churchUsers = await ctx.db
      .query("users")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId))
      .collect();

    let totalExpected = 0;
    let totalPresent = 0;
    let totalLate = 0;
    let totalExcused = 0;
    let totalPhysical = 0;
    let totalOnline = 0;
    
    let ratingSum = 0;
    let ratingCount = 0;

    const excuseCounts: Record<string, number> = {
      Work: 0,
      Health: 0,
      Travel: 0,
      Family: 0,
      Other: 0,
    };

    const trendsList = [];

    const sortedMeetingsForTrends = [...filteredMeetings].sort((a, b) => a.startTime - b.startTime);

    for (const m of sortedMeetingsForTrends) {
      let expectedUsers = [];
      if (m.scope === "ChurchWide") {
        expectedUsers = churchUsers.filter((u) => u.status === "active");
      } else if (m.scope === "Departmental") {
        expectedUsers = churchUsers.filter((u) => u.status === "active" && u.departmentId === m.departmentId);
      } else if (m.scope === "Subunit") {
        expectedUsers = churchUsers.filter((u) => u.status === "active" && u.subunitId === m.subunitId);
      }
      const expectedCount = Math.max(1, expectedUsers.length);
      totalExpected += expectedCount;

      const attendance = await ctx.db
        .query("meetingAttendance")
        .withIndex("by_meeting", (q) => q.eq("meetingId", m._id))
        .collect();

      const present = attendance.filter((a) => a.status === "Present").length;
      const late = attendance.filter((a) => a.status === "Late").length;
      const excused = attendance.filter((a) => a.status === "Excused").length;

      totalPresent += present;
      totalLate += late;
      totalExcused += excused;

      totalPhysical += attendance.filter((a) => a.status !== "Excused" && a.attendanceType === "physical").length;
      totalOnline += attendance.filter((a) => a.status !== "Excused" && a.attendanceType === "online").length;

      attendance.forEach((a) => {
        if (a.wellnessRating !== undefined) {
          ratingSum += a.wellnessRating;
          ratingCount++;
        }
        if (a.status === "Excused" && a.excuseReason) {
          const key = a.excuseReason;
          if (excuseCounts[key] !== undefined) {
            excuseCounts[key]++;
          } else {
            excuseCounts.Other++;
          }
        }
      });

      const actualCheckedIn = present + late;
      const attRate = expectedCount > 0 ? Math.round((actualCheckedIn / expectedCount) * 100) : 0;
      const lateRate = actualCheckedIn > 0 ? Math.round((late / actualCheckedIn) * 100) : 0;

      const dateStr = new Date(m.startTime).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      trendsList.push({
        date: dateStr,
        meetingName: m.name,
        attendanceRate: attRate,
        latenessRate: lateRate,
      });
    }

    const actualCheckIns = totalPresent + totalLate;
    const overallAttendanceRate = totalExpected > 0 ? Math.round((actualCheckIns / totalExpected) * 100) : 0;
    const overallLatenessRate = actualCheckIns > 0 ? Math.round((totalLate / actualCheckIns) * 100) : 0;
    const averageRating = ratingCount > 0 ? parseFloat((ratingSum / ratingCount).toFixed(1)) : 0;

    return {
      meetingsCount: filteredMeetings.length,
      attendanceRate: overallAttendanceRate,
      latenessRate: overallLatenessRate,
      averageRating,
      physicalCount: totalPhysical,
      onlineCount: totalOnline,
      excuses: Object.entries(excuseCounts).map(([name, value]) => ({ name, value })),
      trends: trendsList,
    };
  },
});

export const getMeetingsReportList = query({
  args: {
    rangeDays: v.number(),
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

    const startTimeLimit = Date.now() - (args.rangeDays * 24 * 60 * 60 * 1000);
    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_church_start_time", (q) => q.eq("churchId", user.churchId).gt("startTime", startTimeLimit))
      .collect();

    const filteredMeetings = meetings.filter((m) => {
      if (finalSubunitId) return m.subunitId === finalSubunitId;
      if (finalDeptId) return m.departmentId === finalDeptId;
      return true;
    });

    const churchUsers = await ctx.db
      .query("users")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId))
      .collect();

    const results = [];
    for (const m of filteredMeetings) {
      let expectedUsers = [];
      if (m.scope === "ChurchWide") {
        expectedUsers = churchUsers.filter((u) => u.status === "active");
      } else if (m.scope === "Departmental") {
        expectedUsers = churchUsers.filter((u) => u.status === "active" && u.departmentId === m.departmentId);
      } else if (m.scope === "Subunit") {
        expectedUsers = churchUsers.filter((u) => u.status === "active" && u.subunitId === m.subunitId);
      }
      const expectedCount = Math.max(1, expectedUsers.length);

      const attendance = await ctx.db
        .query("meetingAttendance")
        .withIndex("by_meeting", (q) => q.eq("meetingId", m._id))
        .collect();

      const present = attendance.filter((a) => a.status === "Present").length;
      const late = attendance.filter((a) => a.status === "Late").length;
      const excused = attendance.filter((a) => a.status === "Excused").length;
      
      const ratings = attendance.filter((a) => a.wellnessRating !== undefined).map((a) => a.wellnessRating as number);
      const avgRating = ratings.length > 0 ? parseFloat((ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)) : 0;

      const physicalCount = attendance.filter((a) => a.status !== "Excused" && a.attendanceType === "physical").length;
      const onlineCount = attendance.filter((a) => a.status !== "Excused" && a.attendanceType === "online").length;

      const dept = m.departmentId ? await ctx.db.get(m.departmentId) : null;
      const sub = m.subunitId ? await ctx.db.get(m.subunitId) : null;

      results.push({
        _id: m._id,
        name: m.name,
        startTime: m.startTime,
        endTime: m.endTime,
        format: m.format,
        scope: m.scope,
        departmentName: dept?.name || "Church-wide",
        subunitName: sub?.name || "None",
        expectedCount,
        presentCount: present,
        lateCount: late,
        excusedCount: excused,
        physicalCount,
        onlineCount,
        averageRating: avgRating,
      });
    }

    return results.sort((a, b) => b.startTime - a.startTime);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SHIFTS & SWAPS ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

export const getShiftSwapAnalytics = query({
  args: {
    rangeDays: v.number(),
    departmentId: v.optional(v.union(v.id("departments"), v.null())),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user.churchId) return null;

    const userRole = user.role || "";
    const deptRoles = ["DeaconHead", "PastoralOversight", "DepartmentHead", "DepartmentAssistant", "DepartmentSecretary"];
    const subunitRoles = ["SubunitLead", "SubunitAssistant"];
    const allowedRoles = ["SuperAdmin", ...deptRoles, ...subunitRoles];

    if (!allowedRoles.includes(userRole)) throw new Error("Unauthorized");

    // Scope locking
    let finalDeptId: string | null = args.departmentId || null;
    if (deptRoles.includes(userRole)) {
      finalDeptId = user.departmentId || null;
    } else if (subunitRoles.includes(userRole)) {
      finalDeptId = user.departmentId || null;
    }

    const now = Date.now();
    const rangeStart = now - args.rangeDays * 24 * 60 * 60 * 1000;

    // ── 1. Fetch all services in range for this church ──
    const services = await ctx.db
      .query("services")
      .withIndex("by_church", (q: any) => q.eq("churchId", user.churchId))
      .filter((q: any) => q.gte(q.field("startTime"), rangeStart))
      .collect();

    const serviceMap = new Map(services.map((s: any) => [s._id, s]));
    const serviceIds = services.map((s: any) => s._id);

    // ── 2. Fetch rotas for those services ──
    let allRotas: any[] = [];
    for (const sid of serviceIds) {
      const entries = await ctx.db
        .query("rotas")
        .withIndex("by_service", (q: any) => q.eq("serviceId", sid))
        .collect();
      allRotas = allRotas.concat(entries);
    }

    // Filter by department if scoped
    if (finalDeptId) {
      allRotas = allRotas.filter((r: any) => r.departmentId === finalDeptId);
    }

    const totalShifts = allRotas.length;
    const assignedShifts = allRotas.filter((r: any) => r.userId).length;
    const openShifts = totalShifts - assignedShifts;
    const fillRate = totalShifts > 0 ? Math.round((assignedShifts / totalShifts) * 100) : 0;

    // Status breakdown
    const pendingCount = allRotas.filter((r: any) => r.status === "Pending").length;
    const confirmedCount = allRotas.filter((r: any) => r.status === "Confirmed").length;
    const declinedCount = allRotas.filter((r: any) => r.status === "Declined").length;

    // ── 3. Fetch swap requests in range ──
    const allSwaps = await ctx.db
      .query("swapRequests")
      .withIndex("by_church_status", (q: any) => q.eq("churchId", user.churchId))
      .collect();

    const swapsInRange = allSwaps.filter((s: any) => s.createdAt >= rangeStart);

    const swapOffered = swapsInRange.length;
    const swapClaimed = swapsInRange.filter((s: any) => ["claimed", "approved", "declined"].includes(s.status)).length;
    const swapApproved = swapsInRange.filter((s: any) => s.status === "approved").length;
    const swapDeclined = swapsInRange.filter((s: any) => s.status === "declined").length;
    const swapCancelled = swapsInRange.filter((s: any) => s.status === "cancelled").length;
    const swapPending = swapsInRange.filter((s: any) => s.status === "available").length;
    const crossDeptSwaps = swapsInRange.filter((s: any) => s.allowCrossDept).length;

    // Avg resolution time (offered → approved/declined)
    const resolvedSwaps = swapsInRange.filter((s: any) => ["approved", "declined"].includes(s.status));
    const avgResolutionHours = resolvedSwaps.length > 0
      ? Math.round(
          resolvedSwaps.reduce((sum: number, s: any) => sum + (s.updatedAt - s.createdAt), 0) /
          resolvedSwaps.length / (1000 * 60 * 60)
        )
      : 0;

    // ── 4. Weekly trend (fill rate + swaps per week) ──
    const weeks: { weekLabel: string; fillRate: number; swapsOffered: number; swapsApproved: number }[] = [];
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const numWeeks = Math.min(Math.ceil(args.rangeDays / 7), 12);

    for (let i = numWeeks - 1; i >= 0; i--) {
      const wEnd = now - i * weekMs;
      const wStart = wEnd - weekMs;
      const weekDate = new Date(wStart);
      const weekLabel = weekDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

      const weekServices = services.filter((s: any) => s.startTime >= wStart && s.startTime < wEnd);
      const weekServiceIds = new Set(weekServices.map((s: any) => s._id));
      const weekRotas = allRotas.filter((r: any) => weekServiceIds.has(r.serviceId));
      const weekAssigned = weekRotas.filter((r: any) => r.userId).length;
      const weekFill = weekRotas.length > 0 ? Math.round((weekAssigned / weekRotas.length) * 100) : 0;

      const weekSwaps = swapsInRange.filter((s: any) => s.createdAt >= wStart && s.createdAt < wEnd);

      weeks.push({
        weekLabel,
        fillRate: weekFill,
        swapsOffered: weekSwaps.length,
        swapsApproved: weekSwaps.filter((s: any) => s.status === "approved").length,
      });
    }

    // ── 5. Per-department breakdown (SuperAdmin only) ──
    let deptBreakdown: { name: string; total: number; filled: number; fillRate: number }[] = [];
    if (userRole === "SuperAdmin" && !finalDeptId) {
      const departments = await ctx.db
        .query("departments")
        .withIndex("by_church", (q: any) => q.eq("churchId", user.churchId))
        .collect();

      for (const dept of departments) {
        const deptRotas = allRotas.filter((r: any) => r.departmentId === dept._id);
        const deptFilled = deptRotas.filter((r: any) => r.userId).length;
        deptBreakdown.push({
          name: dept.name,
          total: deptRotas.length,
          filled: deptFilled,
          fillRate: deptRotas.length > 0 ? Math.round((deptFilled / deptRotas.length) * 100) : 0,
        });
      }
      deptBreakdown = deptBreakdown.sort((a, b) => b.total - a.total).slice(0, 8);
    }

    // ── 6. Top open-shift claimers ──
    const claimerCounts = new Map<string, number>();
    for (const swap of swapsInRange.filter((s: any) => s.status === "approved" && s.claimantId)) {
      const id = swap.claimantId;
      claimerCounts.set(id, (claimerCounts.get(id) || 0) + 1);
    }
    const topClaimers: { name: string; count: number }[] = [];
    for (const [uid, count] of Array.from(claimerCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      const u = await ctx.db.get(uid as any);
      topClaimers.push({ name: (u as any)?.name || "Unknown", count });
    }

    return {
      // Rota stats
      totalShifts,
      assignedShifts,
      openShifts,
      fillRate,
      pendingCount,
      confirmedCount,
      declinedCount,
      // Swap stats
      swapOffered,
      swapClaimed,
      swapApproved,
      swapDeclined,
      swapCancelled,
      swapPending,
      crossDeptSwaps,
      avgResolutionHours,
      // Trend data
      weeklyTrend: weeks,
      // Dept breakdown (SuperAdmin only)
      deptBreakdown,
      // Top claimers
      topClaimers,
    };
  },
});

// Lightweight sidebar stats — used on the Rota page
export const getRotaSidebarStats = query({
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user.churchId) return null;

    const now = Date.now();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartMs = monthStart.getTime();
    const weekStart = now - 7 * 24 * 60 * 60 * 1000;

    // Open shifts (unassigned) that haven't started yet
    const allRotas = await ctx.db.query("rotas").collect();

    // Fetch services to filter by church + time
    const upcomingServices = await ctx.db
      .query("services")
      .withIndex("by_church", (q: any) => q.eq("churchId", user.churchId))
      .filter((q: any) => q.gte(q.field("startTime"), now))
      .collect();

    const upcomingServiceIds = new Set(upcomingServices.map((s: any) => s._id));

    const openShifts = allRotas.filter((r: any) =>
      !r.userId && upcomingServiceIds.has(r.serviceId)
    ).length;

    // Pending swap approvals (status = "claimed" = waiting for owner to approve)
    const pendingSwaps = await ctx.db
      .query("swapRequests")
      .withIndex("by_church_status", (q: any) => q.eq("churchId", user.churchId).eq("status", "claimed"))
      .collect();

    // Approved swaps this week
    const recentSwaps = await ctx.db
      .query("swapRequests")
      .withIndex("by_church_status", (q: any) => q.eq("churchId", user.churchId).eq("status", "approved"))
      .filter((q: any) => q.gte(q.field("updatedAt"), weekStart))
      .collect();

    // Fill rate this month
    const monthServices = await ctx.db
      .query("services")
      .withIndex("by_church", (q: any) => q.eq("churchId", user.churchId))
      .filter((q: any) => q.gte(q.field("startTime"), monthStartMs))
      .collect();

    const monthServiceIds = new Set(monthServices.map((s: any) => s._id));
    const monthRotas = allRotas.filter((r: any) => monthServiceIds.has(r.serviceId));
    const monthFilled = monthRotas.filter((r: any) => r.userId).length;
    const monthFillRate = monthRotas.length > 0
      ? Math.round((monthFilled / monthRotas.length) * 100)
      : 0;

    return {
      openShifts,
      pendingSwapApprovals: pendingSwaps.length,
      approvedSwapsThisWeek: recentSwaps.length,
      monthFillRate,
    };
  },
});
