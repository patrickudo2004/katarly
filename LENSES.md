# 🎯 Katarly: The Eight Professional Lenses

To ensure Katarly is built to the highest architectural, security, visual, operational, and legal standards, all features and fixes must be scrutinized under these eight professional viewpoints.

---

### 1. 👑 Mega-Church Founder (50k+ Members)
*   **Perspective**: Vision, scalability, community trust, volunteer retention, and high-level operations.
*   **Key Focus**: Does this feature make volunteering rewarding? Does it streamline church operations at a large scale? Does it protect the brand and community trust?
*   **Impact**: Wording should be welcoming (e.g. "Check-In" vs. "Attendance"), dashboards must be clear, and gamification elements (badges, streaks) must feel exciting.

### 2. 🏛️ System Architect
*   **Perspective**: High-level design patterns, system scalability, modularity, and client/server separation of concerns.
*   **Key Focus**: Where should this state live? Is this query idempotent? Are we separating persistent backend data from transient browser session variables?
*   **Impact**: Ensuring session-scoped selections (like current campus view) reside in `sessionStorage` while persistent accounts reside in Convex.

### 3. 💡 Product Designer
*   **Perspective**: Feature feasibility, product roadmap, user onboarding, and matching the user's mental models.
*   **Key Focus**: Does this screen have an escape hatch? Is the user flow intuitive? How does this solve a real-world ministry problem?
*   **Impact**: Implementing the sanctuary selector gate on login and creating zero-friction NFC and QR code check-in workflows.

### 4. 💻 Software Engineer
*   **Perspective**: Implementation details, type safety, code maintainability, and error containment.
*   **Key Focus**: Are all API payloads synchronized? Is the TypeScript complete? Are query loading and empty states handled correctly?
*   **Impact**: Correctly bundling department and subunit payloads, implementing loading guards for skipped queries, and avoiding compiler warnings.

### 5. 🎨 UI/UX Designer (Mobile-First)
*   **Perspective**: Visual legibility, screen responsiveness (375px base viewport), typography, micro-interactions, dark mode aesthetics, and glassmorphism.
*   **Key Focus**: Does it look premium? Are the touch targets large enough for people on the move? Are loaders non-obtrusive?
*   **Impact**: Scoping the GPS loader to the active scanner feed, designing beautiful glassmorphic scan states, and celebrating successes with haptic vibrations and animations.

### 6. 🗄️ Database Administrator (DBA)
*   **Perspective**: Indexes, query performance, write frequency, data normalization, and integrity constraints.
*   **Key Focus**: Are our Convex queries utilizing index lookups? Are we avoiding high-frequency database writes that cause lock contention?
*   **Impact**: Preventing unnecessary database writes during campus switching, enforcing that users belong to parent departments of their subunits.

### 7. 🛡️ Cyber Security Expert
*   **Perspective**: Authentication safety, row-level security (RLS), input validation, session isolation, and preventing horizontal/vertical privilege escalation.
*   **Key Focus**: Is this query secured with the authenticated user context? Can a user fake a check-in? Does logout terminate all sessions?
*   **Impact**: Verifying GPS geofences on the backend during check-in, clearing browser caches and session storage on logout.

### 8. ⚖️ Legal Expert
*   **Perspective**: Compliance, GDPR, data privacy, and safeguarding protocols.
*   **Key Focus**: Do we have consent to fetch location? Are high-risk departments (e.g. Children's Ministry) blocked unless volunteers have verified background checks?
*   **Impact**: Enforcing that GPS tracking is strictly active-only and never stored, and checking safeguarding clearance values during audit trails.

---

## 📱 The Mobile View Audit (Crucial Checklist)

Before concluding any feature design or implementation, it must be audited against these mobile-first requirements:

1. **Viewport & Layout**: Verify layout behavior on standard mobile viewports (375px–412px). Ensure zero horizontal scroll leaks, clean vertical wrapping, and logical component stacking.
2. **Touch Targets**: Enforce a minimum interactive touch target size of `44x44px` with sufficient padding to prevent accidental mis-taps.
3. **Role-Scoped Dashboard Shortcuts**: Confirm that quick actions (e.g., check-in triggers, scheduling modals) are prominently placed directly within the role's mobile dashboard rather than hidden inside desktop-only panels.
4. **Transient Network Handling**: Ensure loaders, fallback skeletons, and skipped query guards are optimized for mobile volunteers operating on cellular connections.

