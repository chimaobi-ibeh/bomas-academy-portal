import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getServerConfig } from "../config.server";

const enquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().default(""),
  message: z.string().trim().min(1).max(5000),
  // Honeypot: hidden from people, bots tend to fill it in.
  website: z.string().optional().default(""),
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Sends a contact form enquiry to the school inbox through Resend.
export const sendEnquiry = createServerFn({ method: "POST" })
  .inputValidator(enquirySchema)
  .handler(async ({ data }) => {
    // Pretend success to bots so they don't retry.
    if (data.website) return { ok: true };

    const config = getServerConfig();
    if (!config.resendApiKey) {
      console.error("RESEND_API_KEY is not set");
      throw new Error("Email is not configured.");
    }

    const rows: [string, string][] = [
      ["Name", data.name],
      ["Email", data.email],
      ["Phone", data.phone || "Not given"],
    ];
    const html = `
      <h2 style="font-family:sans-serif">New website enquiry</h2>
      <table style="font-family:sans-serif;border-collapse:collapse">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`,
          )
          .join("")}
      </table>
      <p style="font-family:sans-serif;white-space:pre-wrap;margin-top:16px">${escapeHtml(data.message)}</p>
    `;
    const text = `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${data.message}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.contactFromEmail,
        to: [config.contactToEmail],
        reply_to: data.email,
        subject: `Website enquiry from ${data.name}`,
        html,
        text,
      }),
    });

    if (!res.ok) {
      console.error("Resend error", res.status, await res.text());
      throw new Error("Could not send your message.");
    }
    return { ok: true };
  });
