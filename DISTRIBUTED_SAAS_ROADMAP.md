# Distributed SaaS & Self-Hosting Roadmap (v2.0)

This document outlines the strategic vision for transitioning ServeSync from a central Cloud (SaaS) model to a distributed, self-hosted model where churches can "own" their data and run the app on their own infrastructure.

---

## 1. The Vision: "WordPress for Church Management"
The goal is to make ServeSync installable on any web hosting provider (GoDaddy, AWS, DigitalOcean) using a church's own subdomain (e.g., `portal.ourchurch.org`).

### Key Benefits
*   **True Data Ownership**: Sensitive member data lives on the church's private server.
*   **Brand Authority**: The app runs on the church's own domain.
*   **Privacy**: Eliminates the "Big Tech" middleman for data storage.

---

## 2. Technical Architecture: The "Plumbing" Analogy
Switching backends is a **refactor**, not a rebuild. 

*   **The House (Frontend)**: The UI, charts, Network Map, and CSS remain exactly the same.
*   **The Plumbing (Backend)**: We swap "City Water" (Convex Cloud) for a "Private Well" (Self-hosted SQLite/Node).

### Recommended Tech Stack for Portability
1.  **PocketBase (The "Holy Grail")**:
    *   A single-file executable containing the database, auth, and storage.
    *   Ideal for "one-click" style installations.
2.  **SQLite (Database-as-a-File)**:
    *   The database is just a file (e.g., `church_data.db`).
    *   Makes backups as easy as copying a file to Google Drive.
3.  **Docker**:
    *   For professional hosting (AWS/DigitalOcean), we provide a `docker-compose.yml` file that sets up the whole environment in one command.

---

## 3. The Business Model: "Remote Brains"
To ensure monetization while giving churches local control, we use a hybrid strategy:

*   **Local Instance**: Stores names, phone numbers, and daily logs.
*   **Central License Server**: The app "calls home" to verify the subscription.
*   **Remote Engine (The API)**: Heavy features like Advanced Analytics, AI Forecasting, and PDF generation are processed on *your* central server. If the subscription expires, these "smart" features turn off while the local data remains accessible.

---

## 4. Implementation Steps (Future)
1.  **Backend Translation**: Convert Convex functions into standard Node.js/Express functions.
2.  **Data Migration Tool**: Build a script to move data from Convex to the church's new SQLite database.
3.  **Update Center**: Build a "One-Click Update" button in the church's admin panel to pull new UI features from your master repository.

---

> **Status**: This is a future roadmap. Current development remains focused on the **Convex Cloud** model for maximum speed and rapid iteration during the MVP phase.
