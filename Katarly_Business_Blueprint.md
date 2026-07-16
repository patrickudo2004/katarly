# 📋 Katarly Business Blueprint: Tiers, Pricing, Deployments & Legal

---

## Part 1: The Three Tiers — Explained with Real Scenarios

---

### 🟢 Tier 1: Hosted SaaS (Standard Plan)

**What it means**: The church signs up for an account on your platform at `katarly.app`. You manage everything — the servers, the database, the deployments, the uptime. They just log in and use it. Their data sits in *your* Convex backend, fully isolated from other churches by their unique `churchId` — but physically co-located on the same infrastructure.

**Real Scenario**:
> Bethel Community Church in Birmingham has 80 volunteers across 6 departments. Their department heads are managing WhatsApp groups and paper rosters. The pastor's wife heard about Katarly from a friend at Winners' Chapel. She visits `katarly.app`, registers the church, and the SuperAdmin begins setting up departments immediately. She pays £59/month on her church debit card. She never thinks about servers or databases. She just uses it.

**Why this works for you**:
- Zero setup overhead. One codebase, one backend, one Vercel project.
- You can handle hundreds of churches this way simultaneously.
- Revenue is fully recurring and predictable.
- When you push a code update (a new feature, a bug fix), every Tier 1 church gets it instantly.

**Suggested Pricing**:

| Plan Size | Volunteers | Monthly Price | Annual Price (save 2 months) |
| :--- | :--- | :--- | :--- |
| Starter | Up to 50 | £29/mo | £290/yr |
| Growth | 50 – 200 | £59/mo | £590/yr |
| Congregation | 200 – 500 | £99/mo | £990/yr |

---

### 🔵 Tier 2: Dedicated Instance (White-Label / Data Sovereignty Plan)

**What it means**: The church wants their data to live in a database instance *they own*, not shared infrastructure. You create a dedicated deployment specifically for them — a separate Convex project under their email, a custom subdomain, and a branded experience. You still manage and push all code from your GitHub repository. You just deploy it to *their* cloud environment.

**Real Scenario**:
> Winners' Chapel Manchester. Their Deacon Board reviewed your presentation. They liked the product but raised concerns about where member data is stored — names, attendance records, phone numbers. You explain: "I will create a Convex database account registered under `wchapelmanchester@gmail.com`. That account belongs to the church. I will deploy the app code to it and map it to `catalyst.queenschapel.co.uk`. Your data never touches any other church's storage. If you ever choose to leave Katarly, I hand over the database credentials and walk away." They agree. You charge a setup fee and a higher monthly maintenance rate.

**Why this works for you**:
- Answers GDPR, data sovereignty, and institutional security concerns directly.
- The church pays a premium for this peace of mind.
- You still write zero new code. Same GitHub repo. Different deployment environment variables.
- It positions you as a *serious, enterprise-aware vendor* — not just a student project.

**Suggested Pricing**:

| Item | Cost |
| :--- | :--- |
| One-time Setup Fee | £400 – £800 |
| Monthly Maintenance & Support | £99 – £149/mo |
| Annual Plan | £900 – £1,200/yr |

> **Note**: The setup fee covers your time to create the Convex project, configure the subdomain DNS, migrate/seed any initial data, and onboard their SuperAdmin.

---

### 🔴 Tier 3: Enterprise Self-Host (One-Time License)

**What it means**: For large denominational bodies (e.g., a national Winners' Chapel UK headquarters, or a denomination with 50+ member churches). They have their own IT department and want to run the software entirely on their own servers — no cloud dependency at all. You hand them a deployment package and a license.

**Real Scenario**:
> The Winners' Chapel UK national office wants to deploy Katarly across all 40 of their UK branches. Each branch gets a subdomain. They have an IT director who manages their own AWS or Azure infrastructure. You negotiate a one-time license fee for the software. You provide a deployment guide, environment setup scripts, and a 6-month support contract. After that, they operate independently, but can purchase annual support renewals from you.

**Why this works for you**:
- Very high one-time revenue (£2,000 – £10,000+ depending on church size).
- You are free from ongoing maintenance obligations.
- Optional annual support contracts provide recurring income.

**Suggested Pricing**:

| Item | Cost |
| :--- | :--- |
| One-time License Fee | £2,000 – £8,000 |
| Initial Setup Consultation | £500 – £1,500 |
| Annual Support Contract (optional) | £500 – £1,000/yr |

---

## Part 2: How Multiple Deployments Work (One GitHub Repo → Many Churches)

This is simpler than it sounds. Here is the exact flow:

### Your Repository Structure (unchanged)
```
github.com/patrickudo2004/katarly     ← Your one codebase
```

### Vercel: Multiple Projects, One Repository

In Vercel, you can link **multiple separate projects** to the same GitHub repository. Each project has its own:
- Custom domain
- Environment variables (critically: `VITE_CONVEX_URL`)
- Deployment preview settings

**Step-by-Step for a New Church (Tier 2)**:
1. The church creates a Convex account at `convex.dev` using their email.
2. They create a new project in their Convex dashboard (this gives them a unique backend URL like `https://happy-horse-123.convex.cloud`).
3. They invite you as a developer (you get deploy access without owning their data).
4. In Vercel, you create a **new Vercel project** → link to your same GitHub repo → set `VITE_CONVEX_URL=https://happy-horse-123.convex.cloud` as an environment variable.
5. You set the custom domain (e.g., `catalyst.queenschapel.co.uk`) in that Vercel project.
6. You run `npx convex deploy --yes` using the church's deploy key to push the backend schema and functions to their Convex instance.
7. Done. That church has their own live, isolated deployment.

### How Updates Work
When you push a code fix to your GitHub `main` branch:
- Vercel **automatically rebuilds and redeploys every linked project simultaneously**.
- Every church gets the update within 2–3 minutes.
- You touch zero databases. You just pushed code.

### How to Manage This at Scale
As you grow, maintain a simple spreadsheet:

| Church Name | Vercel Project Name | Convex URL | Domain | Tier | Monthly Fee |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Winners' Chapel MCR | katarly-wcm | happy-horse-123.convex.cloud | catalyst.queenschapel.co.uk | Tier 2 | £129/mo |
| Bethel Birmingham | katarly-bethel | friendly-owl-456.convex.cloud | katarly.app/bethel | Tier 1 | £59/mo |

---

## Part 3: Sample Data Processing Agreement (DPA)

> **IMPORTANT**: This is a draft template for reference purposes. Before using it with a real church client, have it reviewed by a solicitor familiar with UK GDPR and the Data Protection Act 2018.

---

**DATA PROCESSING AGREEMENT**

*Between*

**[YOUR FULL LEGAL NAME / BUSINESS NAME]** ("Data Processor"), a software developer and service provider operating under the brand name Katarly,

*and*

**[CHURCH LEGAL NAME]** ("Data Controller"), a religious organisation operating at [Church Address].

---

**1. Definitions**

1.1 "**Personal Data**" means any information relating to an identified or identifiable natural person (a volunteer, member, or staff of the Data Controller).

1.2 "**Processing**" means any operation performed on Personal Data, including storage, organisation, retrieval, use, or deletion.

1.3 "**The Service**" means the Katarly volunteer management application provided by the Data Processor.

---

**2. Scope and Purpose**

2.1 The Data Processor processes Personal Data solely for the purpose of delivering the Service to the Data Controller.

2.2 The Data Processor shall not process Personal Data for any purpose beyond what is necessary to fulfil this Agreement.

2.3 The Data Processor shall not sell, transfer, or share Personal Data with third parties for marketing or commercial purposes.

---

**3. Data Controller Obligations**

3.1 The Data Controller confirms they have lawful basis to collect the Personal Data of their volunteers and members and to instruct the Data Processor to process it on their behalf.

3.2 The Data Controller is solely responsible for obtaining informed consent from members where required by UK GDPR.

---

**4. Data Processor Obligations**

4.1 The Data Processor shall implement appropriate technical and organisational security measures to protect Personal Data against unauthorised access, accidental loss, or destruction.

4.2 The Data Processor shall notify the Data Controller within **72 hours** of becoming aware of a Personal Data breach.

4.3 On termination of this Agreement, the Data Processor shall, at the Data Controller's written request, delete or return all Personal Data and certify in writing that it has done so.

---

**5. Sub-Processors**

5.1 The Data Processor uses the following sub-processors to deliver the Service:
- **Convex Inc.** (database and backend hosting) — convex.dev
- **Vercel Inc.** (frontend application hosting) — vercel.com

5.2 The Data Processor shall ensure all sub-processors are bound by data protection obligations equivalent to those in this Agreement.

---

**6. Data Subject Rights**

6.1 The Data Processor shall assist the Data Controller in responding to data subject access requests, erasure requests, and rectification requests within statutory timeframes.

---

**7. Term and Termination**

7.1 This Agreement is effective from the date of signature and remains in force for the duration of the Service subscription.

7.2 Either party may terminate with **30 days' written notice**.

---

**8. Governing Law**

This Agreement shall be governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.

---

**Signed on behalf of the Data Processor**:

Name: _________________________
Signature: _____________________
Date: _________________________

**Signed on behalf of the Data Controller**:

Name: _________________________
Role: __________________________
Signature: _____________________
Date: _________________________

---

## Part 4: Your Mobile App Strategy (Future Roadmap)

1. **Phase 1 (Now)**: PWA web app — already works on mobile browsers. This is your MVP.
2. **Phase 2 (6–12 months)**: Build an **Expo (React Native)** app using the same Convex backend. Target Android first (simpler publishing process), then iOS.
3. **Phase 3 (12–24 months)**: Submit to Google Play Store and Apple App Store. Charge a separate in-app subscription or bundle it with the church's existing Katarly plan.

---

*Prepared as a planning reference for Katarly — July 2026.*
