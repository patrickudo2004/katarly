import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    phone: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    churchId: v.optional(v.id("churches")),
    role: v.optional(v.union(
      v.literal("Volunteer"),
      v.literal("SubunitLead"),
      v.literal("SubunitAssistant"),
      v.literal("DepartmentHead"),
      v.literal("DepartmentAssistant"),
      v.literal("PastoralOversight"),
      v.literal("DeaconHead"),
      v.literal("Probation"),
      v.literal("OnNotice"),
      v.literal("SuperAdmin")
    )),
    departmentId: v.optional(v.id("departments")),
    subunitId: v.optional(v.id("subunits")),
    // Legacy fields kept for compatibility during migration if needed
    department: v.optional(v.string()), 
    subunit: v.optional(v.string()),
    availability: v.optional(v.any()), // JSON blob for 4-week calendar
    onboardingCompleted: v.optional(v.boolean()),
    skills: v.optional(v.array(v.string())),
    points: v.optional(v.number()), // Current spendable points
    totalPointsEarned: v.optional(v.number()), // Lifetime earnings
    additionalSubunits: v.optional(v.array(v.string())),
    isExtendedProbation: v.optional(v.boolean()),
    isBorrowed: v.optional(v.boolean()),
  }).index("email", ["email"])
    .index("by_church", ["churchId"]),
  
  churches: defineTable({
    name: v.string(),
    slug: v.string(), // unique identifier for URLs
    logoUrl: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    address: v.optional(v.string()),
    superAdminId: v.id("users"),
    location: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
    settings: v.optional(v.object({
      attendanceWindowMinutes: v.optional(v.number()),
      geofenceRadius: v.optional(v.number()),
      requireLeadApprovalForSwaps: v.optional(v.boolean()),
      defaultQrType: v.optional(v.union(v.literal("Unique"), v.literal("Generic"))),
      qrCodeSecret: v.optional(v.string()), // Church-wide secret for daily passes
      lateThresholdMinutes: v.optional(v.number()),
      autoCheckoutHours: v.optional(v.number()),
      burnoutLimitShiftsPerMonth: v.optional(v.number()),
      swapDeadlineHours: v.optional(v.number()),
      radiusUnit: v.optional(v.union(v.literal("meters"), v.literal("miles"))),
      accentColor: v.optional(v.string()),
    })),
  }).index("by_slug", ["slug"]),

  services: defineTable({
    churchId: v.id("churches"),
    name: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    qrCodeSecret: v.optional(v.string()),
    qrType: v.optional(v.union(v.literal("Unique"), v.literal("Generic"))),
  }).index("by_church", ["churchId"])
    .index("by_church_start_time", ["churchId", "startTime"]),

  departments: defineTable({
    churchId: v.id("churches"),
    name: v.string(),
    headId: v.optional(v.id("users")),
    assistantId: v.optional(v.id("users")),
  }).index("by_church", ["churchId"]),

  subunits: defineTable({
    churchId: v.id("churches"),
    departmentId: v.id("departments"),
    name: v.string(),
    leadId: v.optional(v.id("users")),
    assistantId: v.optional(v.id("users")),
  }).index("by_church", ["churchId"])
    .index("by_department", ["departmentId"]),

  rotas: defineTable({
    serviceId: v.id("services"),
    userId: v.optional(v.id("users")), // Optional for "Open Shifts"
    departmentId: v.id("departments"),
    subunitId: v.optional(v.id("subunits")),
    role: v.string(),
    status: v.union(v.literal("Pending"), v.literal("Confirmed"), v.literal("Declined")),
  }).index("by_service", ["serviceId"])
    .index("by_user", ["userId"]),

  attendance: defineTable({
    serviceId: v.id("services"),
    userId: v.id("users"),
    churchId: v.id("churches"),
    timestamp: v.number(),
    status: v.union(v.literal("Present"), v.literal("Late"), v.literal("Excused")),
    method: v.string(), // "QR", "Manual", or "Override"
    markedById: v.optional(v.id("users")),
    verifiedById: v.optional(v.id("users")),
    location: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
      accuracy: v.number(),
    })),
  }).index("by_service", ["serviceId"])
    .index("by_user", ["userId"])
    .index("by_church", ["churchId"]),

  verificationRequests: defineTable({
    userId: v.id("users"),
    serviceId: v.id("services"),
    churchId: v.id("churches"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("declined")),
    requestedAt: v.number(),
    location: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
    })),
  }).index("by_church_status", ["churchId", "status"])
    .index("by_user", ["userId"]),

  badges: defineTable({
    churchId: v.id("churches"),
    name: v.string(),
    description: v.string(),
    icon: v.string(), // Lucide icon name
    type: v.union(v.literal("milestone"), v.literal("custom")),
    requirementType: v.optional(v.string()), // "streak", "total_services", "total_hours"
    requirementValue: v.optional(v.number()),
  }).index("by_church", ["churchId"]),

  userBadges: defineTable({
    userId: v.id("users"),
    badgeId: v.id("badges"),
    awardedAt: v.number(),
    awardedBy: v.optional(v.id("users")),
    churchId: v.id("churches"),
  }).index("by_user", ["userId"])
    .index("by_church", ["churchId"]),

  swapRequests: defineTable({
    rotaId: v.id("rotas"),
    requesterId: v.id("users"),
    claimantId: v.optional(v.id("users")),
    status: v.union(
      v.literal("available"), 
      v.literal("claimed"), 
      v.literal("approved"), 
      v.literal("declined"),
      v.literal("cancelled")
    ),
    note: v.optional(v.string()),
    churchId: v.id("churches"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_rota", ["rotaId"])
    .index("by_church_status", ["churchId", "status"]),

  probationPeriods: defineTable({
    userId: v.id("users"),
    churchId: v.id("churches"),
    startDate: v.number(),
    endDate: v.number(),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("extended"), v.literal("ended")),
    createdBy: v.id("users"), // Dept Head
  }).index("by_user", ["userId"]),

  kpiLogs: defineTable({
    probationId: v.id("probationPeriods"),
    userId: v.id("users"),
    loggerId: v.id("users"), // Subunit Lead
    date: v.number(),
    score: v.union(v.literal("Excellent"), v.literal("Good"), v.literal("Needs Improvement"), v.literal("Disapprove")),
    note: v.optional(v.string()),
  }).index("by_probation", ["probationId"]),

  borrowRequests: defineTable({
    churchId: v.id("churches"),
    requestingDeptHeadId: v.id("users"),
    targetDeptHeadId: v.id("users"),
    targetDept: v.string(),
    targetSubunit: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    count: v.number(),
    role: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("declined"), v.literal("active"), v.literal("expired")),
    volunteers: v.optional(v.array(v.id("users"))),
  }).index("by_church", ["churchId"]),

  borrowAssignments: defineTable({
    userId: v.id("users"),
    requestId: v.id("borrowRequests"),
    churchId: v.id("churches"),
    startDate: v.number(),
    endDate: v.number(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined"), v.literal("active"), v.literal("expired")),
  }).index("by_user", ["userId"]),

  invites: defineTable({
    email: v.string(),
    churchId: v.id("churches"),
    invitedBy: v.id("users"),
    role: v.string(),
    departmentId: v.optional(v.id("departments")),
    subunitId: v.optional(v.id("subunits")),
    // Legacy fields
    department: v.optional(v.string()),
    subunit: v.optional(v.string()),
    token: v.string(),
    expiresAt: v.number(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("revoked"), v.literal("expired")),
  }).index("by_token", ["token"])
    .index("by_email_church", ["email", "churchId"])
    .index("by_church_status", ["churchId", "status"]),

  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.string(),
    read: v.boolean(),
  }).index("by_user", ["userId"]),

  channels: defineTable({
    churchId: v.id("churches"),
    type: v.union(v.literal("announcement"), v.literal("department"), v.literal("subunit"), v.literal("deaconBoard")),
    departmentId: v.optional(v.id("departments")),
    subunitId: v.optional(v.id("subunits")),
    // Legacy fields
    department: v.optional(v.string()),
    subunit: v.optional(v.string()),
    name: v.string(),
    isDisabled: v.boolean(),
  }).index("by_church", ["churchId"])
    .index("by_dept", ["churchId", "departmentId"])
    .index("by_subunit", ["churchId", "departmentId", "subunitId"]),

  messages: defineTable({
    channelId: v.id("channels"),
    userId: v.id("users"),
    text: v.optional(v.string()),
    fileId: v.optional(v.id("fileUploads")),
    isPinned: v.boolean(),
    isOversight: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_channel", ["channelId"]),

  fileUploads: defineTable({
    storageId: v.id("_storage"),
    mimeType: v.string(),
    name: v.string(),
    size: v.number(),
    userId: v.id("users"),
  }),

  rewards: defineTable({
    churchId: v.id("churches"),
    name: v.string(),
    description: v.string(),
    cost: v.number(),
    stock: v.optional(v.number()),
    image: v.optional(v.string()),
    category: v.union(v.literal("Food"), v.literal("Merch"), v.literal("Experience"), v.literal("Other")),
  }).index("by_church", ["churchId"]),

  redemptions: defineTable({
    userId: v.id("users"),
    rewardId: v.id("rewards"),
    churchId: v.id("churches"),
    status: v.union(v.literal("pending"), v.literal("fulfilled"), v.literal("cancelled")),
    redeemedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_church", ["churchId"]),

  timeOffRequests: defineTable({
    userId: v.id("users"),
    churchId: v.id("churches"),
    startDate: v.number(),
    endDate: v.number(),
    reason: v.string(),
    status: v.union(v.literal("Pending"), v.literal("Approved"), v.literal("Rejected")),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_church", ["churchId"])
    .index("by_church_status", ["churchId", "status"]),
});
