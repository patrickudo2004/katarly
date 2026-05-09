# Katarly Architectural Vision: Convex vs. PocketBase

This document captures thoughts on the long-term goal of turning Katarly into a "Distributed SaaS" (Bring Your Own Backend) where churches can host their own data, and whether PocketBase is the right tool to replace Convex.

## Why PocketBase is a Perfect Fit for Distributed SaaS
If the ultimate goal is to let churches host their own data on a cheap VPS or web host while you manage the frontend, **PocketBase is arguably the best tool on the market.**

1. **The Ultimate Self-Hosting Experience:** PocketBase is a single, lightweight executable file (built in Go with an embedded SQLite database). A church's IT administrator literally just drops the file on a server, runs it, and they have a fully functioning backend with a beautiful admin dashboard.
2. **Built-in Features:** It has near feature parity with Convex for your needs: Authentication (Email/Password, Google OAuth), File Storage, and Database.
3. **Real-time Capabilities:** PocketBase supports real-time subscriptions out of the box using Server-Sent Events (SSE). This means Katarly's "Killer Feature" (live QR attendance and Service Mode) will still work beautifully.
4. **Data Portability:** Because the entire database is just one SQLite file (`data.db`), backups and migrations for the church are as simple as copying that single file.

## The Trade-offs: What You Will Lose (or have to rewrite)
Moving from Convex to PocketBase is not a 1:1 swap. Here are the biggest hurdles you will face in the future:

**1. Where does the business logic live?**
*   **Convex:** Right now, your business logic (like verifying if someone can swap a shift, checking allowed roles before creating a service, or cascade-deleting rotas) lives safely on the server in your Convex mutations.
*   **PocketBase:** PocketBase acts primarily as a REST API. To enforce business rules securely, you either have to rely on its "API Rules" (which are great for simple permissions but hard for complex logic), write custom JavaScript hooks inside the PocketBase server, or move the logic to the frontend (which is a security risk). 

**2. The "Magic" of Real-Time State**
*   **Convex:** Convex uses WebSockets to automatically patch your React UI. You just call `useQuery`, and it magically updates when the database changes.
*   **PocketBase:** You will have to manually write code to listen to PocketBase SSE events and then update your React state or React Query cache. It’s totally doable, but it requires more boilerplate code than Convex.

**3. Frontend Architecture Changes**
Right now, your frontend connects to one hardcoded Convex URL (`VITE_CONVEX_URL`). If every church has its own PocketBase server, your app needs a way to know *which* server to connect to. You would likely need to have users type in their church's unique server URL on the login screen, or use subdomains (e.g., `winnerschapel.katarly.com` points the frontend to their specific PocketBase IP).

## The Verdict
**Yes, PocketBase is a brilliant choice for this specific "decentralized" business model.** 

However, it is recommended to stick with Convex to finish the MVP, validate the product with your first church, and refine the feature set. Once the product is proven and ready to scale to churches that demand local data ownership, you can plan a deliberate "Katarly v2.0" migration to PocketBase.
