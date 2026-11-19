import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// Called once a day by Vercel Cron (see vite.config.ts). Re-checks unconfirmed payments,
// retries unsent emails, deletes unpaid applications older than 30 days, and keeps the
// Supabase project active. Vercel sends "Authorization: Bearer <CRON_SECRET>".
export const Route = createFileRoute("/api/admissions/reconcile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getAdmissionsConfig } = await import("@/lib/admissions/config.server");
        const { safeEqual } = await import("@/lib/admissions/security.server");
        const config = getAdmissionsConfig();
        const auth = request.headers.get("authorization") ?? "";
        if (!config.cronSecret || !safeEqual(auth, `Bearer ${config.cronSecret}`)) {
          return new Response(null, { status: 401 });
        }
        const { makeDeps } = await import("@/lib/admissions/deps.server");
        const { reconcile } = await import("@/lib/admissions/service.server");
        try {
          const summary = await reconcile(makeDeps());
          return Response.json(summary, { headers: { "Cache-Control": "no-store" } });
        } catch (e) {
          console.error("[admissions] reconcile failed", (e as Error).message.slice(0, 200));
          return new Response(null, { status: 503 });
        }
      },
    },
  },
});
