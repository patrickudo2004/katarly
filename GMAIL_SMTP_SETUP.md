# The "Zero-Cost, No Domain" Email Setup (Gmail + EmailJS)

Because our backend (Convex) runs in a highly secure, serverless environment, it blocks raw network sockets. This means we cannot use standard SMTP libraries (like `nodemailer`) directly. 

However, we can bypass this by using **EmailJS**, a free service that acts as a bridge. It connects directly to your Gmail account and provides us with a simple HTTP API URL that Convex can call safely.

This method costs **$0**, requires **no custom domain**, and gives you **200 emails per month** for free.

---

## Step 1: Prepare Your Gmail Account
We highly recommend creating a fresh Gmail account for your app (e.g., `katarlyapp@gmail.com`) so you don't mix personal emails with app traffic.

1. Create a new Gmail account.
2. Go to **Manage your Google Account** > **Security**.
3. Turn on **2-Step Verification**.
4. Search for **App Passwords** in the security settings.
5. Create a new App Password (name it "EmailJS") and **copy the 16-character password**. (You will need this in Step 2).

---

## Step 2: Set Up EmailJS
EmailJS will act as the bridge between Convex and your Gmail account.

1. Sign up for a free account at [emailjs.com](https://www.emailjs.com/).
2. Go to **Email Services** and click **Add New Service**.
3. Select **Gmail**.
4. In the configuration popup:
   - **Name**: Katarly Gmail
   - **Service ID**: Leave as default (e.g., `service_abc123`). **Save this ID!**
   - **Email Address**: Your dedicated Gmail address.
   - **App Password**: Paste the 16-character password you generated in Step 1.
5. Click **Connect Account** and then **Create Service**.

---

## Step 3: Create the Email Template
This tells EmailJS what the Magic Link email should look like.

1. In EmailJS, go to **Email Templates** and click **Create New Template**.
2. **Subject**: `Sign in to Katarly`
3. **Content**: 
   ```html
   <h2>Welcome to Katarly!</h2>
   <p>Click the link below to securely sign in to your account. This link will expire in 24 hours.</p>
   <a href="{{magic_link}}">Sign In to Katarly</a>
   ```
4. Click the **Settings** tab on the template.
   - **Template ID**: Save this ID! (e.g., `template_xyz789`).
5. **Save** the template.

---

## Step 4: Get Your API Keys
1. In EmailJS, click on **Account** (top right corner) > **API Keys**.
2. Copy your **Public Key** and **Private Key**.

---

## Step 5: Configure Convex
Now we give our Convex backend the keys to trigger the emails. Run these commands in your VS Code terminal, replacing the placeholder values with your actual keys:

```bash
npx convex env set EMAILJS_SERVICE_ID your_service_id
npx convex env set EMAILJS_TEMPLATE_ID your_template_id
npx convex env set EMAILJS_PUBLIC_KEY your_public_key
npx convex env set EMAILJS_PRIVATE_KEY your_private_key
```

---

## Step 6: Update the Auth Code
Finally, we update our authentication configuration to use EmailJS via a standard `fetch()` request.

Open your `convex/auth.ts` file and replace the `Email({ ... })` section with this:

```typescript
import Google from "@auth/core/providers/google";
import { Email } from "@convex-dev/auth/providers/Email";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Email({
      id: "magic-link",
      async sendVerificationRequest({ identifier: email, url }) {
        console.log(`Sending magic link to ${email} via EmailJS...`);
        
        const payload = {
          service_id: process.env.EMAILJS_SERVICE_ID,
          template_id: process.env.EMAILJS_TEMPLATE_ID,
          user_id: process.env.EMAILJS_PUBLIC_KEY,
          accessToken: process.env.EMAILJS_PRIVATE_KEY,
          template_params: {
            to_email: email,
            magic_link: url,
          }
        };

        const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("EmailJS Error:", errorText);
          throw new Error("Failed to send magic link email.");
        }
        
        console.log("Magic link sent successfully!");
      },
    }),
  ],
});
```

### You're Done!
When a user requests a magic link, Convex will now securely ping EmailJS, which will log into your Gmail account and send the email directly to the user. No custom domain required, and it completely bypasses the strict spam filters because it originates from a verified Google server.
