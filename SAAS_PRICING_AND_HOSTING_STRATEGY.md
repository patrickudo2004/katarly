# Katarly SaaS Tiering & Hosting Strategy

This document captures our strategic discussions regarding how to price, distribute, and host Katarly for churches, balancing their desire for data ownership with the realities of web hosting and software maintenance.

## 1. The Realities of Web Hosting
A common misconception is that churches can install modern real-time apps on basic shared hosting.

*   **The Shared Hosting Problem:** Cheap $3/month shared hosting (like standard GoDaddy or HostGator with cPanel) only supports PHP and static files. It strictly blocks executables (like PocketBase) and Docker containers for security reasons.
*   **The Domain Name Reality:** Churches **do not** have to use GoDaddy hosting just because they bought their domain (`church.com`) on GoDaddy. They can easily point their domain to any server (or to your hosted SaaS).
*   **The Self-Hosting Requirement:** If a church insists on physically hosting their own database, they must rent a Virtual Private Server (VPS) from a provider like DigitalOcean, AWS, or Hostinger. They cannot use basic shared hosting.

## 2. The Recommended SaaS Tiering Model
The most profitable and frictionless way to distribute Katarly is to host it centrally (you host the frontend on Vercel and the backend on Convex/PocketBase).

### Tier 1: Free Tier
*   **Hosting:** Hosted 100% by you.
*   **Domain:** No custom domain (e.g., `katarly.com/winnerschapel`).
*   **Data Ownership:** The church can click "Export Data" at any time to download their records. This builds trust without giving up control of the server.

### Tier 2: Pro Tier
*   **Hosting:** Hosted 100% by you.
*   **Domain:** Custom Domain Linking (e.g., `serve.winnerschapel.com`). This is a premium white-label feature.
*   **Data Ownership:** Full data export available.

### Tier 3: Custom / Enterprise Tier (BYOB - Bring Your Own Backend)
*   **Hosting:** You host the frontend (`app.katarly.com`). The church hosts the backend database (PocketBase) on their own VPS or physical server.
*   **How it works:** The frontend has a configuration screen where the church enters their API URL (e.g., `https://api.their-server.com`).
*   **The "Version Mismatch" Danger:** If you update the frontend with a new feature that requires a new database column, the app will break for the Enterprise church unless their IT guy runs the database update script *first*.
*   **Pricing:** Because of the heavy IT support burden this tier creates, it should be priced as an expensive annual "License & Support Contract" (e.g., $5,000+/year), not a standard monthly SaaS fee.

## 3. The "Dedicated Cloud" Alternative
Before offering the Enterprise Tier (which requires relying on the church's IT guy), consider offering a **Dedicated Cloud** tier:

*   **How it works:** You rent a $5-$10 VPS specifically for them. Only their church's data is on that machine.
*   **The Benefit:** They get absolute physical data isolation and security (and even direct database login access if they want).
*   **Why it's better for you:** *You* still control the server. When you push a frontend update, *you* can automatically run the database update on their server. There are no broken apps, and you don't have to deal with their internal IT department.
