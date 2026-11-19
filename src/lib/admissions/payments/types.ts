/**
 * Payment-provider abstraction. The application workflow only talks to this interface, so a
 * different gateway can be added later without touching the admission logic.
 */

export type InitializeInput = {
  /** Unique per checkout attempt. */
  reference: string;
  amountKobo: number;
  currency: "NGN";
  email: string;
  callbackUrl: string;
  /** Non-sensitive metadata only (no health or identity details). */
  metadata: Record<string, string>;
};

export type InitializeResult = { checkoutUrl: string };

export type VerifyResult =
  | {
      status: "success";
      reference: string;
      amountKobo: number;
      currency: string;
      paidAt: string;
      transactionId: string;
      gatewayResponse?: string;
    }
  | { status: "failed" | "abandoned"; reference: string; gatewayResponse?: string }
  /** Still in progress, or the provider has no record yet. */
  | { status: "pending"; reference: string; gatewayResponse?: string };

export type WebhookEvent = { type: "charge.success" | "other"; reference: string | null };

export interface PaymentProvider {
  readonly name: string;
  initialize(input: InitializeInput): Promise<InitializeResult>;
  /** Asks the provider directly; the only source of truth for payment status. */
  verify(reference: string): Promise<VerifyResult>;
  /** Returns null when the signature is invalid. */
  parseWebhook(rawBody: string, headers: Headers): WebhookEvent | null;
}

export class PaymentProviderError extends Error {}
