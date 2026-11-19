import type { AdmissionsConfig } from "../config.server";
import { createPaystackProvider } from "./paystack.server";
import type { PaymentProvider } from "./types";

/** Returns the configured provider, or null when online payment is not set up. */
export function getPaymentProvider(config: AdmissionsConfig): PaymentProvider | null {
  if (config.provider === "paystack") return createPaystackProvider(config.paystackSecret);
  return null;
}

export type { PaymentProvider } from "./types";
