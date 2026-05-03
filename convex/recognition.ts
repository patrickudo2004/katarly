import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

// Manual award by SuperAdmin or DeptHead
export const awardBadge = mutation({
  args: {
    userId: v.id("users"),
    badgeId: v.id("badges"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await auth.getUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser || !["SuperAdmin", "DepartmentHead"].includes(currentUser.role)) {
      throw new Error("Unauthorized to award badges");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("Target user not found");

    const badge = await ctx.db.get(args.badgeId);
    if (!badge) throw new Error("Badge not found");

    // Check if already awarded
    const existing = await ctx.db
      .query("userBadges")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("badgeId"), args.badgeId))
      .first();

    if (existing) return existing._id;

    const userBadgeId = await ctx.db.insert("userBadges", {
      userId: args.userId,
      badgeId: args.badgeId,
      awardedAt: Date.now(),
      awardedBy: currentUserId,
      churchId: targetUser.churchId!,
    });

    // Award points
    await ctx.db.patch(args.userId, {
      points: (targetUser.points || 0) + 100,
      totalPointsEarned: (targetUser.totalPointsEarned || 0) + 100,
    });

    // Notify user
    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: "New Badge Awarded! 🏆",
      message: `You've been awarded the "${badge.name}" badge by ${currentUser.name}.`,
      type: "badge_awarded",
      read: false,
    });

    return userBadgeId;
  },
});

// Query for user profile
export const getUserBadges = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const userBadges = await ctx.db
      .query("userBadges")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const badges = await Promise.all(
      userBadges.map(async (ub) => {
        const badge = await ctx.db.get(ub.badgeId);
        return { ...ub, badge };
      })
    );

    return badges;
  },
});

// Hall of Fame query
export const getHallOfFame = query({
  args: { churchId: v.id("churches"), department: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let usersQuery = ctx.db
      .query("users")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId));

    const users = await usersQuery.collect();
    
    const filteredUsers = args.department 
      ? users.filter(u => u.department === args.department)
      : users;

    const leaderboard = await Promise.all(
      filteredUsers.map(async (user) => {
        const badges = await ctx.db
          .query("userBadges")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();
        
        const attendance = await ctx.db
          .query("attendance")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();

        return {
          userId: user._id,
          name: user.name,
          role: user.role,
          department: user.department,
          badgeCount: badges.length,
          attendanceCount: attendance.length,
          badges: await Promise.all(badges.slice(0, 3).map(async b => await ctx.db.get(b.badgeId))),
        };
      })
    );

    // Sort by badge count then attendance
    return leaderboard.sort((a, b) => b.badgeCount - a.badgeCount || b.attendanceCount - a.attendanceCount).slice(0, 20);
  },
});

// Internal helper to check and award milestones
export async function checkMilestonesInternal(ctx: any, userId: any) {
  const user = await ctx.db.get(userId);
  if (!user) return;

  const attendance = await ctx.db
    .query("attendance")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .order("desc")
    .collect();

  const totalServices = attendance.length;
  
  // Calculate streak
  let streak = 0;
  for (const record of attendance) {
    if (record.status === "Present" || record.status === "Late") {
      streak++;
    } else {
      break;
    }
  }

  // Calculate total hours (assuming each service is ~2 hours if not specified)
  let totalHours = 0;
  for (const record of attendance) {
    const service = await ctx.db.get(record.serviceId);
    if (service) {
      const durationHours = (service.endTime - service.startTime) / (1000 * 60 * 60);
      totalHours += durationHours || 2;
    }
  }

  // Get all milestone badges for this church
  if (!user.churchId) return;
  const milestoneBadges = await ctx.db
    .query("badges")
    .withIndex("by_church", (q) => q.eq("churchId", user.churchId!))
    .filter((q) => q.eq(q.field("type"), "milestone"))
    .collect();

  for (const badge of milestoneBadges) {
    let qualified = false;
    if (badge.requirementType === "total_services" && totalServices >= (badge.requirementValue || 0)) {
      qualified = true;
    } else if (badge.requirementType === "streak" && streak >= (badge.requirementValue || 0)) {
      qualified = true;
    } else if (badge.requirementType === "total_hours" && totalHours >= (badge.requirementValue || 0)) {
      qualified = true;
    }

    if (qualified) {
      // Check if already awarded
      const existing = await ctx.db
        .query("userBadges")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("badgeId"), badge._id))
        .first();

      if (!existing) {
        await ctx.db.insert("userBadges", {
          userId: userId,
          badgeId: badge._id,
          awardedAt: Date.now(),
          churchId: user.churchId!,
        });

        // Award points for milestone
        await ctx.db.patch(userId, {
          points: (user.points || 0) + 50,
          totalPointsEarned: (user.totalPointsEarned || 0) + 50,
        });

        await ctx.db.insert("notifications", {
          userId: userId,
          title: "Milestone Reached! 🌟",
          message: `Congratulations! You've earned the "${badge.name}" badge for hitting a new milestone.`,
          type: "milestone_reached",
          read: false,
        });
      }
    }
  }
}

// Mutation wrapper for manual check if needed
export const checkMilestones = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await checkMilestonesInternal(ctx, args.userId);
  },
});

// Helper to get stats for profile
export const getUserStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    let streak = 0;
    for (const record of attendance) {
      if (record.status === "Present" || record.status === "Late") {
        streak++;
      } else {
        break;
      }
    }

    let totalHours = 0;
    for (const record of attendance) {
      const service = await ctx.db.get(record.serviceId);
      if (service) {
        const durationHours = (service.endTime - service.startTime) / (1000 * 60 * 60);
        totalHours += durationHours || 2;
      }
    }

    return {
      streak,
      totalServices: attendance.length,
      totalHours: Math.round(totalHours),
    };
  },
});

// Seed default badges for a church
export const seedBadges = mutation({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const defaults = [
      { name: "3-Month Streak", description: "Served for 3 consecutive months", icon: "Flame", type: "milestone", requirementType: "streak", requirementValue: 12 },
      { name: "100 Services", description: "Attended 100 services in total", icon: "Trophy", type: "milestone", requirementType: "total_services", requirementValue: 100 },
      { name: "Easter Hero", description: "Served during the Easter special services", icon: "Egg", type: "custom" },
      { name: "Perfect Attendance 2025", description: "No missed shifts in 2025", icon: "CheckCircle", type: "milestone", requirementType: "streak", requirementValue: 52 },
      { name: "1000 Hours", description: "Dedicated over 1000 hours of service", icon: "Clock", type: "milestone", requirementType: "total_hours", requirementValue: 1000 },
    ];

    for (const badge of defaults) {
      const existing = await ctx.db
        .query("badges")
        .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
        .filter((q) => q.eq(q.field("name"), badge.name))
        .first();

      if (!existing) {
        await ctx.db.insert("badges", {
          ...badge,
          churchId: args.churchId,
        } as any);
      }
    }
  },
});
