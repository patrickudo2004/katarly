# 🎯 Katarly: Master Project Handoff Blueprint & System Documentation

This document serves as the master knowledge transfer blueprint for the **Katarly** (formerly *ServeSync*) Progressive Web App (PWA). It provides subsequent AI sessions and developers with a comprehensive guide to the application's vision, scripture origin, directory layout, technical architecture, database schemas, role hierarchies, critical workflows, and testing/verification protocols.

---

## 1. App Identity & Scriptural Origin

The app is branded as **Katarly**. The name represents a digital nervous system designed specifically for the house of God.

*   **Derivation**: The name is derived from the Greek biblical root verb **καταρτίζω (*katartízō*, Strong's G2675)** and its noun form **καταρτισμός (*katartismós*, Strong's G2676)**.
*   **Scriptural Connection**:
    *   **Ephesians 4:12**: *"For the **perfecting** [καταρτισμόν - *katartismon*, equipping/furnishing] of the saints, for the work of the ministry..."* Katarly's core vision is to equip and coordinate the saints (volunteers) to serve in their respective departments.
    *   **Matthew 4:21**: Used to describe the disciples **mending** (*katartizontas*) their fishing nets. In the app, this represents resolving schedule gaps, managing swaps, and handling volunteer borrowing.
    *   **1 Corinthians 1:10**: *"That ye be **perfectly joined together** [katērtismenoi]..."* representing the alignment of church departments under a unified system.

---

## 2. Technical Stack & Architecture

Katarly is designed as a secure, real-time SaaS platform.

*   **Frontend**: 
    *   React 19 + TypeScript + Vite.
    *   **Styling**: Custom Vanilla CSS modules matching mobile-first responsive guidelines.
    *   **Global UI State**: Zustand (for theme toggles, sidebar collapse states, layout coordinates).
    *   **Analytics**: Recharts (fully modularized dynamic graphs, attendance consistency charts, excuse reason distributions, and lateness score tracking).
*   **Backend**: 
    *   Convex Cloud (Reactive database subscriptions, server mutations, and scoped queries).
    *   **Authentication**: `@convex-dev/auth` (magic link passwordless email magic links and Google OAuth).
*   **Notifications**: 
    *   EmailJS integration for triggering transactional alert emails (e.g. shift assignments, registration requests, swap alerts) routed through the dedicated app account `katarly.auth@gmail.com` to recipients, including SuperAdmin updates at `patrickudo2004@gmail.com`.
*   **NFC/QR Scanning**:
    *   QR pass scanning utilizes `html5-qrcode` in browser PWAs. NFC checking leverages tag password protection keys and 4-byte passwords.

---

## 3. Strict Security Scoping & Role Hierarchy

Volunteering in ministries like *Winners' Chapel* relies on a hierarchical authority chain. Access to data, mutations, and views is restricted using server-side validation.

| Role | Color | Icon | Authority and Scoping Boundaries |
| :--- | :--- | :--- | :--- |
| **SuperAdmin** | Purple (`#8b5cf6`) | Crown | Church-wide system configuration. Bypasses all geofencing and lockout rules. Can schedule past services, manage all departments, and execute audit checks. |
| **DeaconHead** | Deep Navy (`#1e3a5f`) | Scale/Gavel | Governing board authority. Enforces binding decisions, reviews escalations, manages all departments, and retains access to assign/schedule past dates. |
| **PastoralOversight** | Deep Green (`#15803d`) | Shepherd Staff | Spiritual covering. Escalates issues to the Deacon Board. Can view church-wide report metrics, but cannot mutate operational schedules. |
| **DepartmentHead** | Black (`#111827`) | Gold Border | Manages a single department (and its subunits). Can approve time-off, issue borrow requests, and view departmental analytics. |
| **SubunitLead** | Slate Gray (`#6b7280`) | — | Operates a single subunit. Gated to modify local rota assignments and record member KPIs. Cannot create global services. |
| **Volunteer** | Red (`#ef4444`) | — | Base user. Limited to their personal dashboard, schedule views, shift marketplace swaps, and personal QR pass generation. |
| **Probation** | Blue (`#3b82f6`) | Dashed Border | Active volunteers under observation. Dashboard reflects active progress gauges. |
| **OnNotice** | Orange (`#f59e0b`) | — | Warning status flag. Restricts priority shift selection. |
| **Borrowed** | Purple Outline | — | Temporary cross-department or cross-subunit assignment status, inheriting scope permissions. |

---

## 4. Key Workflows & Operations

### 4.1. Geofenced QR & Custom Location Check-In
When checking in, the volunteer's GPS coordinates (`lat`, `lng`) are captured.
1.  **Distance Calculation**: The distance is calculated using the **Haversine formula** on the server.
2.  **Standard Geofence**: Compares coordinates to the church location coordinates and enforces the `settings.geofenceRadius` (e.g. 100m).
3.  **Custom Event Location**: If a service or meeting is scheduled at a temporary venue (crusade, outreach) and has a `customLocation` configuration, the geofence calculation automatically shifts to use the custom coordinates and radius.
4.  **Online Bypass**: If a service/meeting format is configured as `Online`, or if the assigned volunteer's role format is `Online`, geofencing constraints are bypassed.
5.  **Temporal Validation**: Check-in must occur within the `attendanceWindowMinutes` before the start time and after the end time of the closest active service.

### 4.2. Personal QR Pass Verification
Volunteers can generate a timed check-in token:
1.  **Token Generation**: `generateCheckInToken` updates `tempCheckInToken` on the user record.
2.  **Token Validation**: A scanning supervisor scans the volunteer's pass. `verifyAndMarkCheckIn` compares the token, validates the volunteer's profile, verifies active membership, and marks them present.

### 4.3. Shift Swapping & Marketplace
Volunteers can put their confirmed shifts up for swap:
1.  **Scoping rules**: Open shifts and swaps are scoped to the volunteer's department or borrowed status. If `allowCrossDept` is true, the shift is made available globally.
2.  **Temporal Lockout**: Shifts starting less than 2 hours in the future are automatically hidden from the marketplace to avoid last-minute abandonment.
3.  **Past Date Gating**: Past shifts are blocked from assignment/dropping by volunteers and subunit leads. Only SuperAdmins and DeaconHeads retain the override to assign past dates.

### 4.4. Volunteer Borrowing System
When a subunit is short-staffed, they can borrow volunteers:
1.  **Request Model**: `borrowRequests` store the requesting department, target department, time range, role requirements, and target volunteer list.
2.  **Borrow Assignment**: Once approved by the target department head, a `borrowAssignments` record is created, temporarily mapping the volunteer into the borrowing department's security scope.
3.  **Borrow Tracker**: UI accordion widget displaying confirming status (`pending`, `approved`, `declined`, `expired`) and allowing leaders to cancel pending requests.

### 4.5. Gamified Probation & Rotations
1.  **Period Config**: Setup duration, start, and end dates for a user.
2.  **Subunit Rotation**: Support defining a rotation array `rotationSubunits` to rotate the probationer through multiple subunits.
3.  **KPI Recording**: Leadership records weekly performance scores (`Excellent`, `Good`, `Needs Improvement`, `Disapprove`) in `kpiLogs`.
4.  **Graduation**: When criteria are satisfied (e.g., 90% attendance consistency and good feedback), the leader triggers graduation, automatically upgrading the role to `Volunteer`.

---

## 5. Convex Database Schema (`convex/schema.ts`)

Here is a summary of the 21 database tables that power Katarly:

1.  **`users`**: User profile parameters, security roles, church bindings, gamified points, and email preference objects.
    *   *Indexes*: `email`, `by_church`, `by_status`, `by_dept`
2.  **`churches`**: Multi-tenant organizations. Stores geofencing configs, late thresholds, and features (like `enableRewardsMarketplace`).
    *   *Indexes*: `by_slug`
3.  **`services`**: Operational church service schedules. Houses format (Physical, Online, Hybrid) and custom event coordinates.
    *   *Indexes*: `by_church`, `by_church_start_time`
4.  **`departments`**: Church department directories.
    *   *Indexes*: `by_church`
5.  **`subunits`**: Department operations sub-teams.
    *   *Indexes*: `by_church`, `by_department`
6.  **`rotas`**: Service scheduling slots. Connects a service, volunteer, department, and subunit.
    *   *Indexes*: `by_service`, `by_user`, `by_service_user`
7.  **`attendance`**: Rota check-in log records. Captures verify method, actor, location coordinates, and timestamps.
    *   *Indexes*: `by_service`, `by_user`, `by_church`
8.  **`verificationRequests`**: Geofence failure overrides awaiting leader verification.
    *   *Indexes*: `by_church_status`, `by_user`
9.  **`badges`**: Achievement milestones and gamification definitions.
    *   *Indexes*: `by_church`
10. **`userBadges`**: Mapping of milestones awarded to volunteers.
    *   *Indexes*: `by_user`, `by_church`
11. **`swapRequests`**: Roster swap market postings.
    *   *Indexes*: `by_rota`, `by_church_status`, `by_requester`, `by_claimant`
12. **`probationPeriods`**: Metadata tracking a member's probation status.
    *   *Indexes*: `by_user`, `by_church`, `by_church_status`
13. **`kpiLogs`**: Weekly reports recorded for probationers.
    *   *Indexes*: `by_probation`, `by_user`
14. **`borrowRequests`**: Inter-department help requests.
    *   *Indexes*: `by_church`, `by_requesting_dept`, `by_target_dept`, `by_target_user`
15. **`borrowAssignments`**: Scoped mapping dates of borrowed volunteers.
    *   *Indexes*: `by_user`, `by_church`, `by_request`
16. **`invites`**: Invitation tokens issued to onboard new members.
    *   *Indexes*: `by_token`, `by_email_church`, `by_church_status`
17. **`notifications`**: User alert entries.
    *   *Indexes*: `by_user`
18. **`channels`**: Scoped chat channels.
    *   *Indexes*: `by_church`, `by_dept`, `by_subunit`
19. **`messages`**: Real-time communication entries.
    *   *Indexes*: `by_channel`
20. **`fileUploads`**: Uploaded chat assets mapping to Convex storage.
21. **`rewards` & `redemptions`**: Marketplace point redemption logs.
    *   *Indexes*: `by_church`, `by_user`
22. **`timeOffRequests`**: Leave requests.
    *   *Indexes*: `by_user`, `by_church`, `by_church_status`
23. **`escalations`**: Pastoral oversight referrals.
    *   *Indexes*: `by_church_status`, `by_initiator`
24. **`memberships`**: Direct mapping of users to departments and roles.
    *   *Indexes*: `by_user`, `by_church`, `by_user_church`
25. **`subunitStats`**: Automatically compiled efficiency stats.
    *   *Indexes*: `by_church`, `by_church_score`
26. **`auditLogs`**: Log files for sensitive administrative actions.
    *   *Indexes*: `by_church`
27. **`meetings`**: Internal gatherings (meetings/seminars/briefings).
    *   *Indexes*: `by_church`, `by_church_start_time`, `by_department_start_time`, `by_subunit_start_time`
28. **`meetingAttendance`**: Check-in records for internal meetings.
    *   *Indexes*: `by_meeting`, `by_user`, `by_meeting_user`

---

## 6. Verification and Automated Testing

Katarly has a test suite located in `/tests` powered by **Vitest** and **JSDOM**.

### 6.1. Running Tests
Execute the test command:
```bash
npm test
```

### 6.2. Test Suite Breakdown
*   **`backend.test.ts`**: Verifies authorization logic for meeting creations and geofenced attendance mutations.
*   **`borrow.test.ts`**: Verifies validation logic, borrow assignments, and borrow limits.
*   **`borrowForm.test.tsx`**: Renders forms and checks field validation states.
*   **`borrowTracker.test.tsx`**: Renders the accordion status panel and checks action triggers.
*   **`components.test.tsx`**: Renders critical layout elements.
*   **`pastDateBlocking.test.ts`**: Asserts that only SuperAdmins and DeaconHeads can assign and modify past dates, blocking other roles.

---

## 7. Operational Guidelines for Future AI Agents

When picking up this project, any AI agent must review these rules:

1.  **Maintain Multi-Tenant Isolation**: Every database query and mutation MUST validate `churchId` matches the authenticated user's `churchId` to prevent data leaks.
2.  **Apply Scoping Checks**: Ensure leaders (SubunitLeads, DepartmentHeads) can only view or edit resources within their assigned `subunitId` or `departmentId`.
3.  **Support Mobile Viewports**: The app uses a hybrid UI/UX. The desktop view uses the `Layout.tsx` sidebar, and the mobile view (viewport <= 1024px) uses `MobileLayout.tsx` and `BottomNav.tsx`. Verify styling compatibility on both formats before deploying.
4.  **Enforce Past-Date Restrictions**: Always verify that standard roles cannot select, assign, or drop shifts for events that occurred in the past.
5.  **Compile & Lint Checks**: Before submitting or pushing code, run compilation checks:
    ```bash
    npm run lint
    npm run build
    ```
6.  **Convex Deployment**: Execute Convex schema deployments synchronously:
    ```bash
    npx convex deploy --yes
    ```

---
*Document prepared in July 2026. Ready for seamless continuation.*
