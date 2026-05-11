# Product Requirements Document (PRD) – Katarly v1.0 MVP

**Product Name:** Katarly  
**Version:** 1.0 MVP  
**Date:** March 2026  
**Product Owner:** [Your Name]  
**Target Users:** Churches (starting with Winners Chapel Manchester, then any church worldwide)  
**Platform:** Google Antigravity + Convex backend + Vercel frontend  
**Goal:** Build a production-ready, multi-tenant, real-time volunteer management SaaS that completely replaces Google Sheets, WhatsApp groups, and paper sign-in sheets for church departments.

---

## 1. Executive Summary & Vision

Katarly is a modern, mobile-first Progressive Web App (PWA) built specifically for churches. It provides a single, secure, real-time platform for managing volunteers across departments and subunits with the **exact hierarchy churches already use**.

### Key Differentiators

- Real-time QR-code attendance with geofence verification (the "killer feature")
- Deacon Head role — governing board authority with private board channel and escalation approval
- Pastoral Oversight role with spiritual covering and escalation authority to the Deacon Board
- Volunteer recognition, streaks, and Hall of Fame to drive retention
- Shift-swap marketplace and inter-department borrowing to eliminate last-minute chaos
- Scoped real-time chat with file uploads (no more WhatsApp)
- Strict role-based permissions and row-level security

**Success Vision:** On any Sunday, a volunteer scans a QR → every leader and Pastoral Oversight sees the update instantly → Deacon Heads govern with real data → rotas, probation, and morale are managed in one beautiful app.

---

## 2. Business Objectives

- Reduce volunteer management admin time for leaders by **80%**
- Increase volunteer retention through recognition and easy self-service
- Give Pastoral Oversight and Senior Pastors real data and escalation tools
- Make the app feel like a native mobile app (installable PWA)
- Enable any church to sign up and run their own isolated tenant in under 2 minutes

---

## 3. User Roles & Personas (with exact permissions and colour badges)

| Role | Colour Hex | Icon | Primary Responsibilities | Dashboard Access |
| :--- | :--- | :--- | :--- | :--- |
| Super Admin | #8b5cf6 (Purple) | Crown | Church-wide oversight, create departments, final escalation, reports | Full church view |
| Deacon Head | #1e3a5f (Deep Navy) | Scale | Governing board — approve escalations, assign PastoralOversight in dept, private board chat | Department + Church-wide |
| Pastoral Oversight | #15803d (Deep Green) | Shepherd staff / cross | Spiritual covering, read-only dept visibility, escalate to Deacon Board, post Oversight messages | Department + Oversight tab |
| Department Head | #111827 (Black) | Gold border | Daily rota management, invite users, approve time-off/borrows, manage probation | Full department |
| Subunit Lead | #6b7280 (Slate Gray) | — | Mark attendance, create subunit rotas, log KPI for probation, offer swaps | Subunit only |
| Volunteer | #ef4444 (Red) | — | View personal schedule, scan QR, request time-off/swap, view badges | Personal only |
| Probation | #3b82f6 (Blue) | Dashed border | Same as Volunteer + visible KPI progress | Personal |
| On Notice | #f59e0b (Orange) | — | Monitored status | Personal |
| Borrowed | Purple outline | — | Temporary cross-dept assignment | Personal + target subunit |

**Rule:** All badges appear on avatars, lists, organogram, chat messages, rotas, and profiles.  
**Hierarchy:** SuperAdmin → DeaconHead → PastoralOversight → DepartmentHead → SubunitLead → Volunteer

---

## 4. Detailed Feature Requirements

### 4.1 Authentication & Onboarding

- Google One-Tap + Email Magic Link only (no passwords ever)
- Strict invite-only hierarchy:
  - Super Admin creates church
  - Super Admin invites Deacon Heads (one per department)
  - Deacon Heads / Super Admin invite Pastoral Oversight (within their dept)
  - Pastoral Oversight / Super Admin invite Dept Heads
  - Dept Heads invite Subunit Leads & Volunteers
- Role elevation/promotion only by higher roles
- Post-invite 3-step wizard: profile photo upload, phone number, availability calendar

### 4.2 Deacon Head Role (mandatory — added April 2026)

- Multiple users may hold this role; each assigned to one department
- Approve or reject escalations from Pastoral Oversight
- Church-wide KPI and health visibility
- Can assign PastoralOversight within their assigned department
- Access to the private Deacon Board channel (SuperAdmin included)
- Deacon Board messages appear in navy blue and are automatically pinned
- Dedicated governance dashboard: escalation queue, dept health, probation summary

### 4.3 Pastoral Oversight Role (mandatory)

- One per department
- Full read-only access to entire department
- Cannot edit rotas or mark attendance
- Escalation buttons for probation, borrow disputes, major time-off (escalates to Deacon Board)
- Special green "Oversight Messages" in chat (pinnable)
- Dedicated "Oversight View" tab with department health score

### 4.4 Attendance System (Killer Feature)

- Dynamic QR generated per service (display on projector/TV)
- Volunteer scans via html5-qrcode
- Automatic checks: geofence (50–100 m radius) + service time window
- Subunit Leads can manual override/approve
- Live real-time update to every dashboard and Service Mode screen

### 4.5 Rota & Scheduling

- Drag-and-drop calendar per subunit/department
- Volunteers indicate availability
- Automatic gap detection and alerts

### 4.6 Shift Swap Marketplace

- Volunteer marks shift as “Available for Swap”
- Eligible volunteers (same subunit or borrowed pool) can claim
- Original owner + Subunit Lead approve
- Auto-update rota on approval

### 4.7 Probation KPI Tracking

- Dept Head creates probation period (default 4 or 8 weeks)
- Subunit Lead logs one-tap KPI after each slot (Excellent / Good / Needs Improvement / Disapprove)
- Auto-generated report at end of period with attendance % + average score
- Disapprove automatically extends probation + notifies everyone

### 4.8 Borrowing System

- Volunteers can serve in multiple subunits inside the same department
- Formal inter-department borrow requests (Dept Head → Dept Head → Volunteer accept/decline)
- Temporary “Borrowed” badge and auto-expiry

### 4.9 Chat & Messaging

- Channels: Department, Subunit, Church-wide Announcements
- **Private Deacon Board Channel**: accessible to DeaconHead and SuperAdmin roles
- Real-time with Convex subscriptions
- File uploads (images, PDF, short video ≤50 MB) stored in Convex File Storage with previews
- Pastoral Oversight messages appear in green with pin option
- Deacon Board messages appear in navy blue and are automatically pinned

### 4.10 Volunteer Recognition & Streaks

- Automatic badges: 3-month streak, Perfect Attendance 2025, 100 services, Total Hours, Easter Hero, etc.
- Dept Heads / Oversight can manually award custom badges
- Church-wide Hall of Fame page (filterable)
- Personal profile shows all badges + streak counter
- Confetti animation + notification on badge award

### 4.11 Organogram & Dashboards

- Interactive tree view showing full hierarchy (Super Admin → Oversight → Dept Head → etc.)
- Role-specific mobile-first dashboards with real-time metrics and charts (Recharts)

### 4.12 Mobile-First PWA Experience

- Fixed bottom navigation bar (role-aware tabs)
- Role-specific home screens:
  - Volunteer: personal calendar + big Scan QR button
  - Subunit Lead: live Service Mode list
  - Department Head / Oversight: summary cards + watchlists
  - Deacon Head: escalation queue, department KPI summary, private board chat access
  - Super Admin: church-wide metrics
- Large touch targets, pull-to-refresh, dark mode default

---

## 5. Technical Stack & Constraints (strict)

- **Frontend:** Vite + React 19 + TypeScript + React Router DOM + React Query + Zustand
- **Styling:** Vanilla CSS only + Lucide React icons
- **Backend & Real-time:** Convex (auth, database, file storage, actions, subscriptions)
- **QR Scanner:** html5-qrcode
- **Charts:** Recharts
- **PWA:** Full manifest + service worker
- **No third-party storage at MVP** (use Convex File Storage only)
- **Deployment:** Vercel

---

## 6. Non-Functional Requirements

- 100% real-time updates (Convex subscriptions)
- Strict row-level security in every mutation and query
- Mobile-first (base 375 px viewport)
- Dark mode default
- Offline support for attendance marking (sync when back online)
- Notifications: in-app + email for all critical actions
- Performance: <2-second updates even on church WiFi
- Accessibility: Large fonts, high contrast, screen-reader friendly
- Security: Invite-only, no public sign-up, Google OAuth + magic links

---

## 7. User Flows (high-level)

1. Church creation → invite Deacon Heads → invite Pastoral Oversight → build department structure → invite volunteers
2. Sunday flow: Leader generates QR → volunteers scan → live attendance + Service Mode
3. Probation flow: Assign → leads log KPI → auto report → decide extend/end → escalate to Deacon Head if needed
4. Recognition flow: System auto-awards → confetti + Hall of Fame update

---

## 8. Out of Scope for v1.0 MVP

- Direct messaging (DMs) between individuals
- Payment/donation module
- AI auto-scheduling
- Voice messages or video calls in chat
- Third-party storage integration (Dropbox/Google Drive)

---

## 9. Success Metrics & Acceptance Criteria

- QR attendance works end-to-end in <5 seconds
- Pastoral Oversight can escalate any issue with one tap
- Volunteers receive at least one badge and see Hall of Fame
- Shift swaps complete without external messaging
- App installs as PWA and works offline for attendance
- Row-level security passes all permission tests

---

## 10. Implementation Phases for Antigravity Agent

**Phase 1:** Schema + Auth + Pastoral Oversight role  
**Phase 2:** Mobile Layout + Bottom Nav + Role-specific dashboards  
**Phase 3:** Attendance QR + Rota + Shift Swap  
**Phase 4:** Probation KPI + Borrowing + Chat + Recognition badges  
**Phase 5:** Organogram + Polish + PWA + Testing + Deployment config  
**Phase 6 (Apr 2026):** DeaconHead role — schema, permissions, private board channel, governance dashboard, role assignment guards

---

**Instructions to Antigravity Agent:**

Use high-reasoning mode. Follow the detailed master prompt style from our previous conversation. Generate files in logical batches and ask for confirmation before major schema changes. Prioritise mobile-first and real-time behaviour. Make every component production-ready with perfect TypeScript, error handling, loading states, and optimistic updates.

**Begin project now.**

---

### End of PRD

This document is exhaustive and self-contained. Paste it directly into Google Antigravity as the project description.