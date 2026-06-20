import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

export const createRequest = mutation({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user?.churchId) throw new Error("Church not found");

    return await ctx.db.insert("timeOffRequests", {
      userId,
      churchId: user.churchId,
      startDate: args.startDate,
      endDate: args.endDate,
      reason: args.reason,
      status: "Pending",
    });
  },
});

export const getRequests = query({
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    const user = await ctx.db.get(userId);
    if (!user?.churchId) return [];

    const requests = await ctx.db
      .query("timeOffRequests")
      .withIndex("by_church", (q) => q.eq("churchId", user.churchId!))
      .order("desc")
      .collect();

    return Promise.all(requests.map(async (req) => {
      const requester = await ctx.db.get(req.userId);
      return {
        ...req,
        userName: requester?.name || requester?.email || "Unknown",
        userRole: requester?.role || "Volunteer",
        departmentId: requester?.departmentId,
        subunitId: requester?.subunitId,
      };
    }));
  },
});

export const updateRequestStatus = mutation({
  args: {
    id: v.id("timeOffRequests"),
    status: v.union(v.literal("Approved"), v.literal("Rejected")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    
    const allowedRoles = ["SuperAdmin", "DepartmentHead", "SubunitLead"];
    if (!user?.role || !allowedRoles.includes(user.role)) {
      throw new Error("Unauthorized to review time off requests");
    }

    const request = await ctx.db.get(args.id);
    if (!request) throw new Error("Time off request not found");

    const requester = await ctx.db.get(request.userId);
    if (!requester) throw new Error("Requester not found");

    if (user.role === "DepartmentHead" && requester.departmentId !== user.departmentId) {
      throw new Error("Unauthorized: You can only review requests in your department");
    }

    if (user.role === "SubunitLead" && requester.subunitId !== user.subunitId) {
      throw new Error("Unauthorized: You can only review requests in your subunit");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      reviewedBy: userId,
      reviewedAt: Date.now(),
      rejectionReason: args.rejectionReason,
    });
  },
});

export const cancelRequest = mutation({
  args: { id: v.id("timeOffRequests") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const request = await ctx.db.get(args.id);
    if (!request) throw new Error("Time off request not found");
    if (request.userId !== userId) throw new Error("Unauthorized");
    if (request.status !== "Pending") throw new Error("Only pending requests can be cancelled");
    
    await ctx.db.delete(args.id);
  },
});
