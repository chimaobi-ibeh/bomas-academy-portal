import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// Paystack sends charge events here. The signature is checked against the raw body, then the
// payment is re-verified with Paystack's API before anything changes.
export const Route = createFileRoute("/api/payments/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        if (raw.length > 100_000) return new Response(null, { status: 413 });
        const { makeDeps } = await import("@/lib/admissions/deps.server");
        const { handleWebhook } = await import("@/lib/admissions/service.server");
        const deps = makeDeps();
        if (deps.provider?.name !== "paystack") return new Response(null, { status: 404 });
        const status = await handleWebhook(deps, raw, request.headers);
        return new Response(null, { status });
      },
    },
  },
});
