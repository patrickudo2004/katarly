# Email Integration Guide: Resend vs. Plunk

This guide provides step-by-step instructions for setting up either **Resend** or **Plunk** for your application's email needs (Magic Link Authentication and Member Invites).

---

## Prerequisites
Before starting either setup, you must own a **Custom Domain** (e.g., `pillarflow.com`). Most email providers will not allow sending from a `.vercel.app` or `.gmail.com` address for security reasons.

---

## Option 1: Resend (The Developer Favorite)

Resend is known for its incredible developer experience and its integration with **React Email**.

### 1. Account Setup
1.  Sign up at [resend.com](https://resend.com).
2.  Go to **Domains** > **Add New Domain**.
3.  Add your domain (e.g., `pillarflow.com`).
4.  Add the provided DNS records (DKIM/SPF) to your domain registrar (GoDaddy, Namecheap, etc.).
5.  Once verified, go to **API Keys** and create a new key.

### 2. Configure Convex
Run the following command in your terminal:
```bash
npx convex env set RESEND_API_KEY re_your_key_here
```

### 3. Implementation (Magic Link Auth)
In `convex/auth.ts`, update your `Email` provider:
```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Inside convexAuth configuration:
Email({
  id: "resend",
  async sendVerificationRequest({ identifier: email, url }) {
    await resend.emails.send({
      from: "Katarly <auth@yourdomain.com>",
      to: [email],
      subject: "Sign in to Katarly",
      html: `<p>Click <a href="${url}">here</a> to sign in.</p>`,
    });
  },
}),
```

---

## Option 2: Plunk (The Indie & Multi-Project Choice)

Plunk is ideal if you want to manage multiple domains or projects on one free tier without strict restrictions.

### 1. Account Setup
1.  Sign up at [useplunk.com](https://useplunk.com).
2.  Go to **Domains** > **Add Domain**.
3.  Follow the DNS verification steps provided.
4.  Go to **API Keys** and copy your Secret Key.

### 2. Configure Convex
Run the following command in your terminal:
```bash
npx convex env set PLUNK_API_KEY your_plunk_key_here
```

### 3. Implementation (Invites)
Create a new file `convex/emails.ts` for handling invites:
```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";

export const sendInviteEmail = action({
  args: {
    email: v.string(),
    token: v.string(),
    churchName: v.string(),
  },
  handler: async (ctx, args) => {
    const response = await fetch("https://api.useplunk.com/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.PLUNK_API_KEY}`,
      },
      body: JSON.stringify({
        to: args.email,
        subject: `You've been invited to join ${args.churchName}`,
        body: `<h1>Welcome!</h1><p>Join here: https://your-app-url.com/invite/${args.token}</p>`,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to send invite email");
    }
  },
});
```

---

## Comparison Summary

| Feature | Resend | Plunk |
| :--- | :--- | :--- |
| **Free Limit** | 3,000/month (100/day) | 1,000/month (No daily cap) |
| **Domains** | 1 Domain (on free tier) | Unlimited |
| **Best For** | React developers who want beautiful templates. | Indie developers managing multiple projects. |
