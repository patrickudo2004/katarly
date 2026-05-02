# Project Initiation Document – Katarly v1.0 MVP

**Date:** March 2026  
**Project Owner:** [Your Name]  
**Platform:** Google Antigravity + Convex + Vercel  
**Target Launch:** Winners Chapel Manchester (then multi-church SaaS)

## 1. Project Vision & Objectives

Create a modern, real-time volunteer management platform that mirrors exactly how large churches operate. It must feel like a native mobile app (PWA) and completely replace Google Sheets rotas, WhatsApp groups, and paper sign-in sheets. Key goal: reduce admin time for leaders by 80% while making volunteers feel valued and seen.

## 2. Exact Hierarchy & Roles (non-negotiable)

| Role | Colour | Icon | Authority Level |
| :--- | :--- | :--- | :--- |
| Super Admin | Purple #8b5cf6 | Crown | Church-wide full control (system) |
| Deacon Head | Deep Navy #1e3a5f | Scale / Gavel | Governing board — binding decisions, escalation approval, dept oversight |
| Pastoral Oversight | Deep Green #15803d | Shepherd staff / cross | Spiritual covering + escalation to Deacon Board |
| Department Head | Black #111827 | Gold border | Day-to-day department management |
| Subunit Lead | Slate Gray #6b7280 | — | Subunit operations & attendance |
| Volunteer | Red #ef4444 | — | Base user |
| Probation | Blue #3b82f6 | Dashed border | Monitored period |
| On Notice | Orange #f59e0b | — | Warning status |
| Borrowed | Purple outline | — | Temporary cross-dept assignment |

**Hierarchy Order (top → bottom):**
SuperAdmin → DeaconHead → PastoralOversight → DepartmentHead → SubunitLead → Volunteer

**Deacon Head Notes:**

- Multiple users may hold this role (one per department — mirrors deacon board structure)
- Each DeaconHead is assigned to a specific department via `departmentId`
- Can approve escalations from PastoralOversight
- Can assign PastoralOversight within their department only
- Has a private Deacon Board chat channel (SuperAdmin excluded unless they also hold DeaconHead)
- SuperAdmin is the only role that can assign DeaconHead

## 3. Exhaustive Feature Specification

### Core Loops

- Church creation → hierarchical invites → role assignment
- Real-time QR attendance with geofence
- Rota creation + Shift Swap Marketplace
- Probation KPI logging + auto reports
- Inter-department borrowing workflow
- Scoped real-time chat with file uploads (Convex storage)
- Volunteer Recognition system (auto streaks + manual badges + Hall of Fame)
- Pastoral Oversight escalation & special green chat messages
- Deacon Board private governance channel (DeaconHead-only)
- Deacon Head escalation approval dashboard (church-wide KPI + probation visibility)

### Mobile Experience (mandatory)

- Fixed bottom navigation (role-aware)
- Role-specific home screens
- Full PWA (installable, offline-first where possible)

### Security & Permissions

- Row-level security in every Convex function
- Higher roles can only escalate/override, never do lower-level daily tasks unless escalated

### UI/UX Principles

- Mobile-first (375px base)
- Dark mode default
- Church-friendly (clean, encouraging, large touch targets)
- Real-time updates on every screen

## 4. Non-Functional Requirements

- Stack: Vite + React 19 + TypeScript + Convex + Vanilla CSS + Lucide
- Real-time everywhere
- No third-party storage at MVP (use Convex files)
- Deployable to Vercel
- Invite-only, Google + Magic Link auth

## 5. Success Criteria (measurable)

- Volunteer scans QR during service → all leaders and Oversight see update in <2 seconds
- Pastoral Oversight can escalate any issue with one tap
- Volunteers receive badges and see Hall of Fame
- Shift swaps happen without WhatsApp
- App works perfectly offline for attendance marking (syncs later)

## 6. Phase Plan for Antigravity Agent

- Phase 1: Schema + Auth + Pastoral Oversight role
- Phase 2: Dashboards + Mobile Layout + Bottom Nav
- Phase 3: Attendance QR + Rota + Shift Swap
- Phase 4: Probation KPI + Borrowing + Chat + Recognition
- Phase 5: Polish, PWA, Organogram, Notifications, Testing
- Phase 6 (Added Apr 2026): DeaconHead role — schema, permissions, private board channel, DeaconHeadHome dashboard

Start in Planning Mode. Use high-reasoning mode. Confirm major schema changes with me before implementing.

Begin project now with the detailed master prompt style.