# Product Description – Katarly

**App Name:** Katarly  
**Tagline:** Real-time volunteer management for churches — the Five Guys app, built for the house of God.  
**Version:** 1.0 MVP (March 2026)  
**Target Audience:** Churches of all sizes (starting with Winners Chapel Manchester and expanding to any church worldwide)  
**Core Purpose:** Katarly is a modern, mobile-first Progressive Web App (PWA) that completely replaces chaotic Google Sheets, WhatsApp groups, paper sign-in sheets, and manual rotas with a single, secure, real-time platform designed exactly around how churches actually operate.

---

## Vision & Mission

Churches run on volunteers — but managing them is still stuck in 2000s tools.  
Katarly brings church volunteer management into the 2020s with the same simplicity and authority structure pastors already use.

It turns every Sunday into a smooth, joyful experience: volunteers scan a QR code and instantly appear as “present” on every leader’s phone. Leaders spend minutes instead of hours on rotas. Pastoral Oversight gets spiritual insight and escalation tools. Volunteers feel seen, valued, and motivated through recognition badges and easy self-service.

Katarly is not just another rota app — it is the **digital nervous system** for church volunteer teams.

---

## Key Differentiators (What Makes Katarly Unique)

1. **Real Hierarchy That Matches Real Churches**  
   Super Admin → Deacon Head (Governing Board) → Pastoral Oversight → Department Head → Subunit Lead → Volunteer

2. **Deacon Head Role (Governing Board)**  
   A navy-blue badge role representing the church’s governing deacon board. One Deacon Head is assigned per department. They approve major escalations, have church-wide visibility, and communicate via a private Deacon Board channel — completely separate from system admin access.

3. **Pastoral Oversight Role**  
   A dedicated green-badge role above Department Heads with read-only visibility, escalation authority to the Deacon Board, and special “Oversight Messages” in chat.

3. **Killer Attendance Feature**  
   Dynamic QR codes displayed on the projector or at the door. Volunteers scan with their phone. The app checks geofence (inside the church) and service time window. Updates appear live for every leader and Pastoral Oversight.

4. **Volunteer Love Built In**  
   Automatic streak badges, perfect attendance awards, Hall of Fame, confetti celebrations, and a personal profile that shows “You’ve served 187 hours this year.”

5. **Smart Flexibility**  
   Shift Swap Marketplace + inter-department borrowing so no more last-minute WhatsApp begging.

6. **Everything in One App**  
   Rotas, attendance, time-off approvals, probation KPI tracking, chat with file uploads, recognition, organogram — no more switching between 5 different tools.

---

## Detailed Feature Overview

### Authentication & Onboarding
- Google One-Tap Sign-In + Email Magic Link (zero passwords)
- Strict invite-only flow that mirrors church authority
- Quick post-invite wizard (photo, phone, availability)

### Role-Based Dashboards & Mobile Experience
- Full PWA with fixed bottom navigation (Home, Schedule, QR/Attendance, Requests, Chat)
- Role-specific home screens:
  - Volunteer: personal calendar + giant “Scan QR” button
  - Subunit Lead: live “Service Mode” showing who has arrived
  - Department Head / Pastoral Oversight: summary cards, probation watchlist, health metrics
  - Deacon Head: department governance dashboard — escalation queue, KPI overview, private board chat
  - Super Admin: church-wide metrics and organogram
- Mobile-first design (large touch targets, dark mode default, works perfectly on church WiFi)

### Attendance System
- Dynamic QR per service (new code every Sunday)
- html5-qrcode scanner + automatic geofence + time validation
- Real-time live updates across all devices
- Manual override for leads when needed

### Rota & Scheduling
- Drag-and-drop calendar per subunit and department
- Smart availability suggestions
- Automatic gap alerts

### Shift Swap Marketplace
- Volunteers can offer a shift for swap
- Others claim it → approval flow → automatic rota update

### Probation KPI Tracking
- Structured probation periods with one-tap KPI logging by Subunit Leads
- Auto-generated reports with attendance % and average score
- Automatic extension on disapproval

### Borrowing System
- Volunteers can serve in multiple subunits inside the same department
- Formal inter-department borrow requests with dual-head approval

### Real-Time Chat
- Dedicated channels: Department, Subunit, Church-wide Announcements
- **Private Deacon Board Channel**: Only accessible to users with the DeaconHead role. SuperAdmin does not have access unless they also hold DeaconHead. Designed for confidential governance discussion.
- File uploads (photos, PDFs, service plans) with beautiful previews
- Pastoral Oversight messages appear in green and can be pinned
- Deacon Board messages appear in navy and are automatically pinned

### Volunteer Recognition & Motivation
- Automatic badges for streaks, total hours, perfect attendance, special events
- Manual awards by leaders and Pastoral Oversight
- Church-wide Hall of Fame + personal badge collection with confetti celebrations

### Organogram & Reporting
- Interactive tree view showing the full hierarchy (including Pastoral Oversight layer)
- Real-time analytics and one-click reports for pastors

---

## Technical Highlights

- **Frontend:** React 19 + TypeScript + Vite + Vanilla CSS + Lucide icons
- **Backend & Real-time:** Convex (auth, database, file storage, subscriptions)
- **Mobile:** Full PWA (installable on any phone, works offline for attendance)
- **Security:** Strict row-level security + invite-only access
- **Deployment:** Vercel + Convex

---

## Benefits for Different Users

**For Volunteers**  
“I finally have my schedule in one place, can swap shifts easily, scan QR in seconds, and see my badges — I feel valued.”

**For Subunit Leads**  
“Marking attendance is now one tap instead of chasing people with a clipboard.”

**For Department Heads**  
“No more WhatsApp chaos. Everything is tracked, approved, and visible in real time.”

**For Pastoral Oversight**  
“I can see the spiritual health of my department, escalate issues quickly, and send encouragement messages that actually reach everyone.”

**For Deacon Board Members (Deacon Head)**  
“I have a private governance space, can approve escalations from pastoral oversight, and see the KPI health of my assigned department — all from my phone.”

**For Senior Pastors (Super Admin)**  
“I finally have real data on volunteer engagement across the entire church.”

---

## Why Churches Will Adopt Katarly

- Built exactly for how they already structure teams (including the often-missing Pastoral Oversight layer)
- Feels like a native app on phones (the device everyone uses on Sunday)
- Real-time everything — no refresh button needed
- Encourages volunteers instead of just managing them
- Starts free and simple for one church, then scales to multi-church SaaS

---

**Katarly is more than software.**  
It is the tool that helps churches serve better, retain volunteers longer, and free up leaders to focus on what really matters — ministry.

**Ready to transform volunteer ministry?**  
Katarly — where every volunteer is seen, every leader is empowered, and every Sunday runs smoothly.

---

**End of Product Description**

This document is written to give Google Antigravity (or any AI coding agent) a clear, inspiring, and exhaustive understanding of the complete vision for Katarly. It can be used alongside the PRD for maximum context.