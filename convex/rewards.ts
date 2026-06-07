import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

async function getAuthenticatedUser(ctx: any) {
  const userId = await auth.getUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  return user;
}

export const getAvailableRewards = query({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rewards")
      .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
      .collect();
  },
});

export const redeemReward = mutation({
  args: { rewardId: v.id("rewards") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const reward = await ctx.db.get(args.rewardId);
    
    if (!reward) throw new Error("Reward not found");
    if (reward.churchId !== user.churchId) throw new Error("Unauthorized");
    
    const userPoints = user.points || 0;
    if (userPoints < reward.cost) {
      throw new Error(`Insufficient points. Need ${reward.cost - userPoints} more.`);
    }

    if (reward.stock !== undefined && reward.stock <= 0) {
      throw new Error("Item out of stock");
    }

    // 1. Deduct points
    await ctx.db.patch(user._id, {
      points: userPoints - reward.cost,
    });

    // 2. Reduce stock if applicable
    if (reward.stock !== undefined) {
      await ctx.db.patch(reward._id, {
        stock: reward.stock - 1,
      });
    }

    // 3. Create redemption record
    const redemptionId = await ctx.db.insert("redemptions", {
      userId: user._id,
      rewardId: reward._id,
      churchId: user.churchId!,
      status: "pending",
      redeemedAt: Date.now(),
    });

    // 4. Notify admin (SuperAdmin)
    const church = await ctx.db.get(user.churchId!) as any;
    if (church?.superAdminId) {
      await ctx.db.insert("notifications", {
        userId: church.superAdminId,
        title: "New Reward Redemption! 🎁",
        message: `${user.name} has redeemed "${reward.name}".`,
        type: "reward_claimed",
        read: false,
      });
    }

    return redemptionId;
  },
});

export const seedDefaultRewards = mutation({
  args: { churchId: v.id("churches") },
  handler: async (ctx, args) => {
    const defaults = [
      { name: "Free Coffee", description: "A hot cup of coffee from the church cafe.", cost: 50, category: "Food" as const, stock: 999 },
      { name: "Katarly T-Shirt", description: "Official Katarly volunteer team shirt.", cost: 500, category: "Merch" as const, stock: 50 },
      { name: "Front Row Parking", description: "Reserved parking spot for next Sunday.", cost: 200, category: "Experience" as const, stock: 1 },
    ];

    for (const item of defaults) {
      const existing = await ctx.db
        .query("rewards")
        .withIndex("by_church", (q) => q.eq("churchId", args.churchId))
        .filter((q) => q.eq(q.field("name"), item.name))
        .first();
      
      if (!existing) {
        await ctx.db.insert("rewards", {
          ...item,
          churchId: args.churchId,
        });
      }
    }
  },
});
