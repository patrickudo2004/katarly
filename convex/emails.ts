import { action } from "./_generated/server";
import { v } from "convex/values";

export const sendNotificationEmail = action({
  args: {
    toEmail: v.string(),
    toName: v.string(),
    subject: v.string(),
    title: v.string(),
    body: v.string(),
    actionUrl: v.optional(v.string()),
    actionText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`[EmailAudit] Dispatching general notification email to: ${args.toEmail}`);
    console.log(`[EmailAudit] Subject: ${args.subject}`);

    const payload = {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_NOTIF_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      accessToken: process.env.EMAILJS_PRIVATE_KEY,
      template_params: {
        to_email: args.toEmail,
        recipient_name: args.toName,
        email_subject: args.subject,
        message_title: args.title,
        message_body: args.body,
        action_url: args.actionUrl || "https://servesync-pi.vercel.app",
        action_text: args.actionText || "Go to Dashboard",
        // Backward compatibility fallbacks if the existing templates use these parameter names
        email: args.toEmail,
        magic_link: args.actionUrl || "https://servesync-pi.vercel.app",
      }
    };

    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[EmailAudit] EmailJS Send Error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    console.log(`[EmailAudit] Email successfully sent to: ${args.toEmail}`);
  },
});
