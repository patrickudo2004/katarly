# Katarly: Feature & Scenario Guide

This guide provides a detailed explanation of the menu items available in the Katarly sidebar, along with real-world scenarios to help you understand the application's core logic.

---

## 1. Dashboard (The Command Center)
*   **Purpose:** The central hub of the application. It dynamically adapts its view based on the user's role (SuperAdmin, DeaconHead, DeptHead, SubunitLead, or Volunteer).
*   **Key Features:** Role-specific KPIs, upcoming shifts, real-time attendance tracking, and pending requests.
*   **Scenario:** A Sunday morning starts. The **Department Head** opens the Dashboard and instantly sees that 80% of the Media Team has clocked in, but the Ushering Team is at 40%. They can immediately message the Ushering Lead via the built-in Chat to check for delays.

## 2. Admin (Hierarchy & People)
*   **Purpose:** Managing the church's organizational structure and personnel.
*   **Key Features:** Create/Delete Departments and Subunits, assign Leadership roles, and manage the Member Directory.
*   **Scenario:** The church starts a new "Social Media" subunit under the Media Department. The **Super Admin** goes to the Admin menu, adds the subunit, and promotes a volunteer to **Subunit Lead** so they can start managing that specific team.

## 3. Church Settings (The Rulebook)
*   **Purpose:** Defining the operational parameters and "physics" of the church's volunteer management.
*   **Key Features:** Geofence Radius, Late Thresholds, Auto-Checkout timers, and Branding (Accent Color).
*   **Scenario:** To ensure data integrity, the **Super Admin** sets a 100m Geofence. Now, a volunteer cannot "clock in" from home; the app will block the scan until they are physically on the church premises.

## 4. Services (The Calendar)
*   **Purpose:** Planning and managing church events.
*   **Key Features:** Set service names, start/end times, and physical locations.
*   **Scenario:** The church plans a "Night of Worship" special event. The secretary creates the service here. Once created, this service becomes available in the **Rota** menu so volunteers can be scheduled for it.

## 5. Attendance (The Heartbeat)
*   **Purpose:** The primary method for tracking volunteer presence.
*   **Key Features:** QR code scanning (Unique or Generic) with GPS/Geofence validation.
*   **Scenario:** A volunteer arrives at the Audio booth. They open the app, tap **Attendance**, and scan the QR code taped to the soundboard. The app verifies their location and marks them as "Present" (or "Late" if they arrived after the threshold).

## 6. Rota (The Schedule)
*   **Purpose:** Managing the assignment of volunteers to specific services.
*   **Key Features:** Visual scheduling, team assignment, and conflict detection.
*   **Scenario:** A **Subunit Lead** needs 4 cameramen for next Sunday. They go to the Rota, select the service, and assign the volunteers. The volunteers receive an instant notification on their phones with the details.

## 7. Time Off (The Planner)
*   **Purpose:** Managing volunteer availability and excused absences.
*   **Key Features:** Submit leave requests, manager approval flow, and automatic Rota blocking.
*   **Scenario:** A volunteer knows they will be on vacation in two weeks. They submit a Time Off request. Their **Lead** approves it, and the system automatically marks them as "Unavailable" in the Rota for that period, preventing accidental scheduling.

## 8. Chat (Scoped Communication)
*   **Purpose:** Secure, organized communication within leadership levels and teams.
*   **Key Features:** Private channels for the Deacon Board, Departments, and Subunits.
*   **Scenario:** The **Choir Department** needs to share a rehearsal video. They post it in the Choir Dept Chat. Only Choir members see it, keeping the church-wide chat clean and the information secure.

## 9. Marketplace (The Swap Shop)
*   **Purpose:** Peer-to-peer shift management to reduce leadership admin work.
*   **Key Features:** Post available shifts, request swaps, and automated Rota updates.
*   **Scenario:** A volunteer wakes up sick. They go to the Marketplace and post their "Audio Lead" shift. Another qualified volunteer accepts the shift. The Rota is updated automatically, and the Lead is notified of the change.

## 10. Hall of Fame (Retention & Morale)
*   **Purpose:** Driving volunteer engagement through gamification and recognition.
*   **Key Features:** Attendance streaks, milestone badges, and performance leaderboards.
*   **Scenario:** A volunteer hits their 12th consecutive Sunday of service. They are automatically awarded the "3-Month Flame" badge and move up the church-wide leaderboard, providing a sense of accomplishment and recognition.

## 11. Invites (Growth)
*   **Purpose:** Streamlined onboarding of new church members.
*   **Key Features:** Secure invitation links and automated department placement.
*   **Scenario:** A new member joins the Ushering team. The **Department Head** generates an invite link and sends it to them. When the member signs up, they are immediately placed in the "Ushering" directory.

## 12. Profile (Personal Dashboard)
*   **Purpose:** A personal space for volunteers to track their individual contribution.
*   **Key Features:** Total hours served, collection of badges, and personal settings.
*   **Scenario:** A volunteer wants to track their growth over the year. They open their Profile to see their "Perfect Attendance" badge and verify they've served over 100 hours in the Media department.
