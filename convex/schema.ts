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
      v.literal("DepartmentSecretary"),
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
    status: v.optional(v.union(v.literal("active"), v.literal("archived"), v.literal("pending_deletion"))),
    statusMetadata: v.optional(v.object({
      archivedAt: v.optional(v.number()),
      archivedBy: v.optional(v.id("users")),
      reason: v.optional(v.string()),
    })),
    // Phase 3: Gamified Probation
    probationMetadata: v.optional(v.object({
      startDate: v.number(),
      endDate: v.optional(v.number()),
      threshold: v.number(), // Attendance % required
      targetServiceCount: v.optional(v.number()),
      promotionStatus: v.union(v.literal("pending"), v.literal("approved"), v.literal("extended")),
    })),
    emailNotificationsEnabled: v.optional(v.boolean()),
    emailPreferences: v.optional(v.object({
      newVolunteerSignups: v.optional(v.boolean()),
      shiftAssignments: v.optional(v.boolean()),
      swapRequests: v.optional(v.boolean()),
      timeOffRequests: v.optional(v.boolean()),
    })),
    tempCheckInToken: v.optional(v.string()),
  }).index("email", ["email"])
    .index("by_church", ["churchId"])
    .index("by_status", ["status"])
    .index("by_dept", ["churchId", "departmentId"]),
  
  probationRemarks: defineTable({
    userId: v.id("users"),
    authorId: v.id("users"),
    churchId: v.id("churches"),
    content: v.string(), // Public note visible to the probationer
    privateNote: v.optional(v.string()), // Private note visible only to leadership
    sentiment: v.union(v.literal("Good"), v.literal("Fair"), v.literal("Concern")),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
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
      nfcSecret: v.optional(v.string()), // 4-byte hex for tag password protection
      nfcAutoCheckinEnabled: v.optional(v.boolean()),
      lateThresholdMinutes: v.optional(v.number()),
      autoCheckoutHours: v.optional(v.number()),
      burnoutLimitShiftsPerMonth: v.optional(v.number()),
      burnoutLimitConsecutiveSundays: v.optional(v.number()),
      enableBurnoutAlerts: v.optional(v.boolean()),
      swapDeadlineHours: v.optional(v.number()),
      radiusUnit: v.optional(v.union(v.literal("meters"), v.literal("miles"))),
      accentColor: v.optional(v.string()),
      enableRewardsMarketplace: v.optional(v.boolean()),
    })),
  }).index("by_slug", ["slug"]),

  services: defineTable({
    churchId: v.id("churches"),
    name: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    qrCodeSecret: v.optional(v.string()),
    qrType: v.optional(v.union(v.literal("Unique"), v.literal("Generic"))),
    format: v.optional(v.union(v.literal("Physical"), v.literal("Online"), v.literal("Hybrid"))),
    platform: v.optional(v.union(v.literal("Teams"), v.literal("Zoom"), v.literal("Meet"), v.literal("Custom"))),
    meetingUrl: v.optional(v.string()),
    locationName: v.optional(v.string()),
    customLocation: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
      address: v.string(),
      geofenceRadius: v.optional(v.number()),
    })),
  }).index("by_church", ["churchId"])
    .index("by_church_start_time", ["churchId", "startTime"]),

  departments: defineTable({
    churchId: v.id("churches"),
    name: v.string(),
    headId: v.optional(v.id("users")),
    assistantId: v.optional(v.id("users")),
    requiresSafeguarding: v.optional(v.boolean()),
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
    roleFormat: v.optional(v.union(v.literal("Physical"), v.literal("Online"))),
    allowCrossDept: v.optional(v.boolean()),
  }).index("by_service", ["serviceId"])
    .index("by_user", ["userId"])
    .index("by_service_user", ["serviceId", "userId"]),

  attendance: defineTable({
    serviceId: v.id("services"),
    userId: v.id("users"),
    churchId: v.id("churches"),
    departmentId: v.optional(v.id("departments")),
    subunitId: v.optional(v.id("subunits")),
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
    allowCrossDept: v.optional(v.boolean()),
  }).index("by_rota", ["rotaId"])
    .index("by_church_status", ["churchId", "status"])
    .index("by_requester", ["requesterId"])
    .index("by_claimant", ["claimantId"]),

  probationPeriods: defineTable({
    userId: v.id("users"),
    churchId: v.id("churches"),
    startDate: v.number(),
    endDate: v.number(),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("extended"), v.literal("ended")),
    createdBy: v.id("users"),
    activeSubunitId: v.optional(v.id("subunits")), // Current subunit rotation stage
    rotationSubunits: v.optional(v.array(v.id("subunits"))), // Array of subunits in rotation
  }).index("by_user", ["userId"])
    .index("by_church", ["churchId"])
    .index("by_church_status", ["churchId", "status"]),

  kpiLogs: defineTable({
    probationId: v.id("probationPeriods"),
    userId: v.id("users"),
    loggerId: v.id("users"),
    subunitId: v.optional(v.id("subunits")), // Subunit tag for this log
    date: v.number(),
    score: v.union(v.literal("Excellent"), v.literal("Good"), v.literal("Needs Improvement"), v.literal("Disapprove")),
    note: v.optional(v.string()),
  }).index("by_probation", ["probationId"])
    .index("by_user", ["userId"]),

  borrowRequests: defineTable({
    churchId: v.id("churches"),
    // Who is requesting help
    requestingUserId: v.id("users"),
    requestingDeptId: v.id("departments"),
    requestingSubunitId: v.optional(v.id("subunits")),
    // Legacy: kept for backwards compatibility during migration
    requestingDeptHeadId: v.optional(v.id("users")),
    // Who is being asked for help
    targetDeptId: v.id("departments"),
    targetSubunitId: v.optional(v.id("subunits")),
    targetUserId: v.id("users"), // The dept head or subunit lead being asked
    // Request details
    borrowType: v.union(v.literal("inter_dept"), v.literal("intra_dept")),
    role: v.string(),
    count: v.number(),
    startDate: v.number(),
    endDate: v.number(),
    note: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("declined"), v.literal("expired")),
    volunteers: v.optional(v.array(v.id("users"))),
  }).index("by_church", ["churchId"])
    .index("by_requesting_dept", ["requestingDeptId"])
    .index("by_target_dept", ["targetDeptId"])
    .index("by_target_user", ["targetUserId"]),

  borrowAssignments: defineTable({
    userId: v.id("users"),
    requestId: v.id("borrowRequests"),
    churchId: v.id("churches"),
    // Store the destination dept/subunit directly for fast scope lookup
    targetDeptId: v.id("departments"),
    targetSubunitId: v.optional(v.id("subunits")),
    startDate: v.number(),
    endDate: v.number(),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("declined"), v.literal("expired")),
  }).index("by_user", ["userId"])
    .index("by_church", ["churchId"])
    .index("by_request", ["requestId"]),

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
    rejectionReason: v.optional(v.string()),
  }).index("by_user", ["userId"])
    .index("by_church", ["churchId"])
    .index("by_church_status", ["churchId", "status"]),

  escalations: defineTable({
    churchId: v.id("churches"),
    initiatorId: v.id("users"), // Pastoral Oversight
    type: v.union(v.literal("probation"), v.literal("borrow"), v.literal("timeOff"), v.literal("other")),
    itemId: v.optional(v.string()), // Reference to original record ID
    note: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("declined")),
    resolvedBy: v.optional(v.id("users")), // DeaconHead
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_church_status", ["churchId", "status"])
    .index("by_initiator", ["initiatorId"]),

  memberships: defineTable({
    userId: v.id("users"),
    churchId: v.id("churches"),
    role: v.union(
      v.literal("Volunteer"),
      v.literal("SubunitLead"),
      v.literal("SubunitAssistant"),
      v.literal("DepartmentHead"),
      v.literal("DepartmentAssistant"),
      v.literal("DepartmentSecretary"),
      v.literal("PastoralOversight"),
      v.literal("DeaconHead"),
      v.literal("Probation"),
      v.literal("OnNotice"),
      v.literal("SuperAdmin")
    ),
    departmentId: v.optional(v.id("departments")),
    subunitId: v.optional(v.id("subunits")),
    onboardingCompleted: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_church", ["churchId"])
    .index("by_user_church", ["userId", "churchId"]),

  subunitStats: defineTable({
    churchId: v.id("churches"),
    subunitId: v.id("subunits"),
    subunitName: v.string(),
    departmentId: v.id("departments"),
    departmentName: v.string(),
    consistencyScore: v.number(),
    avgLatenessMinutes: v.number(),
    trend: v.union(v.literal("up"), v.literal("down"), v.literal("stable")),
    lastCalculatedAt: v.number(),
  }).index("by_church", ["churchId"])
    .index("by_church_score", ["churchId", "consistencyScore"]),

  auditLogs: defineTable({
    churchId: v.id("churches"),
    action: v.string(),            // e.g. "manual_checkin", "override_geofence"
    userId: v.id("users"),         // Target user
    actorId: v.id("users"),        // Admin doing the action
    timestamp: v.number(),
    details: v.string(),
  }).index("by_church", ["churchId"]),

  meetings: defineTable({
    churchId: v.id("churches"),
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
    qrCodeSecret: v.optional(v.string()),
    createdBy: v.id("users"),
    customLocation: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
      address: v.string(),
      geofenceRadius: v.optional(v.number()),
    })),
  })
    .index("by_church", ["churchId"])
    .index("by_church_start_time", ["churchId", "startTime"])
    .index("by_department_start_time", ["departmentId", "startTime"])
    .index("by_subunit_start_time", ["subunitId", "startTime"]),

  meetingAttendance: defineTable({
    meetingId: v.id("meetings"),
    userId: v.id("users"),
    churchId: v.id("churches"),
    timestamp: v.number(),
    attendanceType: v.union(v.literal("physical"), v.literal("online")),
    status: v.union(v.literal("Present"), v.literal("Late"), v.literal("Excused")),
    markedById: v.optional(v.id("users")),
    method: v.union(v.literal("QR"), v.literal("WebJoin"), v.literal("Manual")),
    location: v.optional(v.object({
      lat: v.number(),
      lng: v.number(),
      accuracy: v.number(),
    })),
    excuseReason: v.optional(v.string()),
    excuseDetail: v.optional(v.string()),
    wellnessRating: v.optional(v.number()),
    wellnessFeedback: v.optional(v.string()),
  })
    .index("by_meeting", ["meetingId"])
    .index("by_user", ["userId"])
    .index("by_meeting_user", ["meetingId", "userId"]),
});
