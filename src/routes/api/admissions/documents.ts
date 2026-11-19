import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { UPLOAD_KINDS } from "@/lib/admissions/schema";

const KINDS = ["admission-form", "class-form", "receipt", "all", ...UPLOAD_KINDS] as const;

function page(status: number, message: string) {
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Bomas Academy</title>
<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#1b2340">
<h1 style="font-size:1.4rem">Document not available</h1><p>${message}</p>
<p><a href="javascript:history.back()">Go back</a></p></body>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Downloads are POSTed from the application pages, so the secret token travels in the request
// body and never appears in a URL, browser history or server logs.
export const Route = createFileRoute("/api/admissions/documents")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData().catch(() => null);
        const reference = String(form?.get("ref") ?? "");
        const token = String(form?.get("t") ?? "");
        const audience = form?.get("aud") === "school" ? "school" : "parent";
        const kind = String(form?.get("kind") ?? "") as (typeof KINDS)[number];
        if (!KINDS.includes(kind)) return page(400, "Unknown document.");

        const { makeDeps } = await import("@/lib/admissions/deps.server");
        const { getDocument, AdmissionError } = await import("@/lib/admissions/service.server");
        try {
          const out = await getDocument(makeDeps(), { reference, token, audience, kind }, request.headers);
          if (out.type === "redirect") {
            return new Response(null, { status: 303, headers: { Location: out.url, "Cache-Control": "no-store" } });
          }
          return new Response(out.bytes as Uint8Array<ArrayBuffer>, {
            headers: {
              "Content-Type": out.contentType,
              "Content-Disposition": `attachment; filename="${out.fileName}"`,
              "Cache-Control": "private, no-store",
              "X-Content-Type-Options": "nosniff",
              "X-Robots-Tag": "noindex",
            },
          });
        } catch (e) {
          if (e instanceof AdmissionError) {
            return page(e.code === "RATE_LIMITED" ? 429 : e.code === "NOT_SUBMITTED" ? 409 : 404, e.message);
          }
          console.error("[admissions] document failed", (e as Error).message.slice(0, 200));
          return page(503, "The document could not be prepared right now. Please try again in a few minutes.");
        }
      },
    },
  },
});
