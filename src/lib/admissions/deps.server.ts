import { getAdmissionsConfig } from "./config.server";
import { createResendMailer } from "./email.server";
import { getPaymentProvider } from "./payments/index.server";
import { AdmissionError, type Deps } from "./service.server";
import { StoreUnavailableError } from "./store";
import { createSupabaseStorage, createSupabaseStore } from "./store.server";

/** Production wiring: Supabase + the configured payment provider + Resend. */
export function makeDeps(): Deps {
  const config = getAdmissionsConfig();
  return {
    store: createSupabaseStore(),
    storage: createSupabaseStorage(),
    provider: getPaymentProvider(config),
    mailer: createResendMailer(config),
    config,
  };
}

export type ActionResult<T> =
  | ({ ok: true } & T)
  | { ok: false; code: string; message: string; field?: string };

/** Runs a workflow step and converts errors into messages that are safe to show. */
export async function run<T extends object>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    if (e instanceof AdmissionError) return { ok: false, code: e.code, message: e.message, field: e.details?.field };
    if (e instanceof StoreUnavailableError) {
      return {
        ok: false,
        code: "UNAVAILABLE",
        message:
          "Our application system is temporarily unavailable. Nothing has been charged. Please keep this page open and try again in a few minutes.",
      };
    }
    console.error("[admissions] unexpected error", (e as Error)?.message?.slice(0, 200));
    return { ok: false, code: "ERROR", message: "Something went wrong on our side. Nothing has been charged. Please try again." };
  }
}
