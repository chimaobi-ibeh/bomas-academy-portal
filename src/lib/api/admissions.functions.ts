import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

// Server-only modules are imported inside handlers so they never reach the browser bundle.

const refToken = z.object({
  reference: z.string().trim().max(20),
  token: z.string().trim().max(100),
});

const declared = z.object({ type: z.string().max(60), size: z.number().int().nonnegative() });

function headers() {
  return getRequest()?.headers ?? new Headers();
}

/** Public facts for the admissions pages: is online payment open, and what is the fee. */
export const getAdmissionsInfo = createServerFn({ method: "GET" }).handler(async () => {
  const { getAdmissionsConfig } = await import("@/lib/admissions/config.server");
  const c = getAdmissionsConfig();
  return { enabled: c.paymentsEnabled, feeKobo: c.paymentsEnabled ? c.feeKobo : null, testMode: c.paymentsEnabled && c.testMode };
});

export const createAdmissionApplication = createServerFn({ method: "POST" })
  .validator(
    z.object({
      form: z.unknown(),
      uploads: z.object({
        passport: declared,
        birthCertificate: declared,
        fatherPassport: declared.optional(),
        motherPassport: declared.optional(),
        immunisationCard: declared.optional(),
        surgicalReport: declared.optional(),
      }),
    }),
  )
  .handler(async ({ data }) => {
    const { makeDeps, run } = await import("@/lib/admissions/deps.server");
    const { createApplication } = await import("@/lib/admissions/service.server");
    return run(() => createApplication(makeDeps(), data, headers()));
  });

export const refreshAdmissionUploads = createServerFn({ method: "POST" })
  .validator(refToken)
  .handler(async ({ data }) => {
    const { makeDeps, run } = await import("@/lib/admissions/deps.server");
    const { prepareUploads } = await import("@/lib/admissions/service.server");
    return run(async () => ({ uploads: await prepareUploads(makeDeps(), data, headers()) }));
  });

export const startAdmissionPayment = createServerFn({ method: "POST" })
  .validator(refToken)
  .handler(async ({ data }) => {
    const { makeDeps, run } = await import("@/lib/admissions/deps.server");
    const { startPayment } = await import("@/lib/admissions/service.server");
    return run(() => startPayment(makeDeps(), data, headers()));
  });

export const getAdmissionStatus = createServerFn({ method: "POST" })
  .validator(refToken.extend({ audience: z.enum(["parent", "school"]) }))
  .handler(async ({ data }) => {
    const { makeDeps, run } = await import("@/lib/admissions/deps.server");
    const { getApplicationStatus } = await import("@/lib/admissions/service.server");
    return run(async () => ({ application: await getApplicationStatus(makeDeps(), data, headers()) }));
  });
