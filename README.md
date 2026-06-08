# Katarly (ServeSync) - Real-time Volunteer Operations for the House of God

Katarly is a modern, real-time multi-tenant volunteer management platform (often referred to as *ServeSync*) designed to help churches organize, schedule, and check in their saints and volunteers with zero friction. It replaces chaotic sheets, paper rotas, and cluttered WhatsApp groups with a real-time digital nervous system.

---

## 🎯 High-Impact Features

*   **⚡ Multi-Campus Selector Gate**: On login, users registered across multiple campuses are greeted with a session-isolated campus selector page, preventing them from bypassing campus selection and keeping metrics for different locations isolated.
*   **📍 Sanctuary NFC & QR Check-Ins**:
    *   **QR Scans**: Integrates a camera scanner to verify sanctuary-specific QR codes.
    *   **Browser NFC**: Supports native mobile tag-tapping (Web NFC NDEFReader API) to check in by tapping phone against campus stickers, with a graceful native-tap fallback guide for iOS/Safari.
    *   **Geofencing**: Performs Haversine distance checks on the backend to verify that volunteers are physically within the campus's allowed radius before checking them in.
*   **📹 Hybrid Gatherings & Devotionals**:
    *   Separate scheduled workers' gatherings, prayer devotionals, rehearsals, and feasts from Sunday serving rotas to keep serve metrics clean.
    *   **Option A URL Auto-Detection**: Paste Microsoft Teams (`*.teams.microsoft.com`), Zoom (`*.zoom.us`), or Google Meet (`meet.google.com`) links; the system auto-detects the platform and renders tailored color-branding, platform badges, and icons.
    *   **Join-to-Checkin Flow**: Clicking the virtual "Join" card automatically registers the user's presence (`WebJoin` method) in Convex first, then launches the meeting link in a new tab.
*   **🛡️ Deacon Board Governance**:
    *   Encrypted private communication board channel specifically for Deacons.
    *   Hierarchical approval workflows for Pastoral Oversight escalations (probation warnings, time-off requests).
*   **📋 Rota & Department Safeguards**:
    *   Drag-and-drop Sunday scheduling with real-time gap detection.
    *   Automated department cleansing: changing a member's department automatically cleanses subunit assignments, keeping team live attendance metrics accurate.
*   **🔥 Streaks & Morale**:
    *   Build volunteer appreciation with automatic check-in streaks, custom award badges, and a church-wide Hall of Fame.

---

## 🛠️ Technology Stack

*   **Frontend**: React 19, Vite, TypeScript, React Router DOM, React Query, Zustand
*   **Backend**: Convex (Real-time reactive database, serverless mutations/queries, authentication, index lookups)
*   **Styling**: Premium Vanilla CSS Modules (featuring glassmorphism, responsive grids, tailored brand pallets, dark mode tokens)
*   **Integrations**: Web NFC API, HTML5 QR-Code Scanner, Lucide React Icons, Recharts Analytics

---

## 🚀 How to Run Locally

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Connect to Convex Backend
Convex provides a reactive real-time database. Run the following command to link the workspace to your Convex cloud project:
```bash
npx convex dev
```
This will prompt you to authenticate and select your project. It automatically generates a `.env.local` file containing the environment variable `VITE_CONVEX_URL`.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build & Preview Production PWA Bundle
The app is configured as a fully installable Progressive Web App (PWA). To test service worker caching and offline assets:
```bash
npm run build
npm run preview
```

---

## 📁 Workspace Folder Structure

*   `convex/`: Backend schema definitions, query/mutation functions, and authentication endpoints.
    *   `schema.ts`: Database indexes and tables (`meetings`, `meetingAttendance`, `services`, etc.)
    *   `meetings.ts`: Business logic for geofenced check-ins, privilege scoping, and link whitelist parsing.
*   `src/components/`: Reusable UI components (e.g. `MeetingCard`, `AttendanceScanner`, `RoleBadge`).
*   `src/pages/`: Main application views (`MeetingsPage`, `Dashboard`, `AttendancePage`, `ChurchSelector`).
*   `src/pages/mobile/`: Specialized home dashboards optimized for mobile leadership roles.
*   `src/styles/`: Global styles and dark-mode CSS variables.

---

*Equipping the saints for the work of ministry, for building up the body of Christ. (Ephesians 4:12)*
