import { createHmac } from "node:crypto";
import { safeEqual } from "../security.server";
import {
  PaymentProviderError,
  type InitializeInput,
  type PaymentProvider,
  type VerifyResult,
  type WebhookEvent,
} from "./types";

const API = "https://api.paystack.co";

/**
 * Paystack adapter (https://paystack.com/docs/api/transaction).
 * - initialize: POST /transaction/initialize  -> authorization_url
 * - verify:     GET  /transaction/verify/:reference
 * - webhooks:   HMAC-SHA512 of the raw body with the secret key, in "x-paystack-signature"
 */
export function createPaystackProvider(secretKey: string, fetchImpl: typeof fetch = fetch): PaymentProvider {
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetchImpl(`${API}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      });
      const body = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: unknown };
      if (!res.ok || body.status !== true) {
        // Paystack answers 404/400 for unknown references; callers treat that as "pending".
        throw new PaymentProviderError(`Paystack ${res.status}: ${body.message ?? "request failed"}`);
      }
      return body.data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    name: "paystack",

    async initialize(input: InitializeInput) {
      const data = await call<{ authorization_url: string }>("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify({
          email: input.email,
          amount: input.amountKobo,
          currency: input.currency,
          reference: input.reference,
          callback_url: input.callbackUrl,
          metadata: input.metadata,
          // Settle the whole payment to the section's own bank account. The subaccount is
          // created with a 0% share for the main account, and it bears the Paystack fee.
          ...(input.subaccount ? { subaccount: input.subaccount, bearer: "subaccount" } : {}),
        }),
      });
      if (!data?.authorization_url?.startsWith("https://")) {
        throw new PaymentProviderError("Paystack did not return a checkout URL");
      }
      return { checkoutUrl: data.authorization_url };
    },

    async verify(reference: string): Promise<VerifyResult> {
      let data: {
        status: string;
        reference: string;
        amount: number;
        currency: string;
        paid_at: string | null;
        id: number;
        gateway_response?: string;
        subaccount?: { subaccount_code?: string } | null;
      };
      try {
        data = await call(`/transaction/verify/${encodeURIComponent(reference)}`);
      } catch (e) {
        if (e instanceof PaymentProviderError && /Paystack (400|404)/.test(e.message)) {
          return { status: "pending", reference };
        }
        throw e;
      }
      if (data.reference !== reference) throw new PaymentProviderError("Reference mismatch from Paystack");
      if (data.status === "success") {
        return {
          status: "success",
          reference,
          amountKobo: data.amount,
          currency: data.currency,
          paidAt: data.paid_at ?? new Date().toISOString(),
          transactionId: String(data.id),
          gatewayResponse: data.gateway_response,
          subaccount: data.subaccount?.subaccount_code ?? null,
        };
      }
      if (data.status === "failed" || data.status === "reversed") {
        return { status: "failed", reference, gatewayResponse: data.gateway_response };
      }
      if (data.status === "abandoned") return { status: "abandoned", reference, gatewayResponse: data.gateway_response };
      return { status: "pending", reference, gatewayResponse: data.gateway_response };
    },

    parseWebhook(rawBody: string, headers: Headers): WebhookEvent | null {
      const signature = headers.get("x-paystack-signature") ?? "";
      const expected = createHmac("sha512", secretKey).update(rawBody).digest("hex");
      if (!signature || !safeEqual(signature, expected)) return null;
      try {
        const event = JSON.parse(rawBody) as { event?: string; data?: { reference?: string } };
        return {
          type: event.event === "charge.success" ? "charge.success" : "other",
          reference: event.data?.reference ?? null,
        };
      } catch {
        return null;
      }
    },
  };
}
