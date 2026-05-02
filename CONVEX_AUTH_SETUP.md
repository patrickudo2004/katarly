# How to set up Convex Auth (Google OAuth + magic links)

To enable the authentication system in ServeSync, follow these steps:

## 1. Configure Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Navigate to **APIs & Services > Credentials**.
4. Click **Create Credentials > OAuth client ID**.
5. Select **Web application**.
6. Add your Convex deployment URL to **Authorized JavaScript origins**.
7. Add `https://<your-deployment-name>.convex.site/api/auth/callback/google` to **Authorized redirect URIs**.
8. Copy the **Client ID** and **Client Secret**.
9. In your Convex dashboard, add these as environment variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

## 2. Configure Magic Links (Email Auth)

1. The magic link system uses the `Password` provider with `id: "magic-link"`.
2. To send real emails, you need an email provider like **Resend**.
3. Create a Convex action to send emails and call it from the `verify` callback in `convex/auth.ts`.
4. Set your `AUTH_RESEND_KEY` in the Convex dashboard if using Resend.

## How the new Probation & Borrowing features integrate

### 1. Probation KPI Tracking

- **Lifecycle**: When a Department Head assigns the `Probation` role, a `probationPeriod` is automatically created.
- **Monitoring**: Subunit Leads use the `KPILogger` component after shifts to provide real-time feedback.
- **Auto-Extension**: If a "Disapprove" KPI is logged, the system automatically extends the probation by 4 weeks and updates the user's badge to "Extended Probation".
- **Reporting**: The `ProbationReport` aggregates attendance and KPI scores into a visual summary for both the volunteer and leadership.

### 2. Cross-Subunit & Inter-Department Borrowing

- **Internal Flexibility**: Volunteers can now have `additionalSubunits` assigned within their own department for easy cross-coverage.
- **Formal Borrowing**: Department Heads can initiate a `BorrowRequest` for specific roles and dates.
- **Approval Flow**: The target Department Head approves and selects volunteers, who then receive a notification to accept or decline the temporary assignment.
- **Visual Cues**: Active borrowed volunteers receive a distinct purple-outlined "Borrowed" badge and appear in the requesting department's rota automatically.
- **Auto-Cleanup**: The system automatically expires assignments and returns volunteers to their home department at the end of the specified period.

### 3. Skills System

- Profiles now support a `skills` array (e.g., "Camera", "Sound").
- The borrowing system uses these tags to suggest the most qualified volunteers during the approval process.

## Mobile Layout Guide & Bottom Nav Usage

### 1. Responsive Switching

- The app uses the `useMediaQuery` hook to detect mobile devices (`max-width: 1024px`).
- On mobile, the `Layout` component is replaced by `MobileLayout`, which hides the sidebar and adds a fixed `BottomNav`.

### 2. Role-Aware Bottom Navigation

- **Volunteer**: Home, Schedule, Scan (QR), Requests, Profile.
- **Subunit Lead**: Team, Schedule, Attendance (QR), Chat, Profile.
- **Dept Head**: Home, Schedule, QR, Manage, Profile.
- **Super Admin**: Overview, Depts, Admin, Profile.

### 3. Mobile Home Screens

- Each role has a dedicated mobile home screen optimized for one-handed use.
- **Service Mode**: Subunit leads get a real-time list of check-ins.
- **Countdown**: Volunteers see a prominent countdown to their next service.
- **Charts**: Super Admins see mobile-optimized sparklines for church health.

### 4. PWA Features

- Large touch targets (min 48px).
- Safe area inset support for modern notched phones.
- Smooth transitions and "native-feel" navigation.

## Chat & File Upload Guide (Convex Storage)

### 1. Scoped Channels

- **Announcements**: Global church-wide channel. Only SuperAdmins can post.
- **Department Channels**: Scoped to the user's assigned department.
- **Subunit Channels**: Scoped to the user's primary or additional subunits.

### 2. Real-time Messaging

- Powered by Convex subscriptions for instant delivery.
- Supports text and file attachments.
- Role badges are displayed next to author names for clear hierarchy.

### 3. File Storage & Previews

- Uses **Convex File Storage** for secure, high-speed uploads.
- **Images**: Rendered as thumbnails with full-screen expansion.
- **PDFs/Videos**: Displayed with file icons and direct download/view links.
- **Limits**: Maximum file size is 50MB per upload.

### 4. Moderation

- Department Heads and SuperAdmins can delete any message in their scoped channels.
- Messages can be pinned to the top of the channel for visibility.
- Channels can be disabled by Department Heads if needed.
