import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createPaystackProvider } from "@/lib/admissions/payments/paystack.server";

const SECRET = "sk_test_abc123";

function fakeFetch(responses: Record<string, { status: number; body: unknown }>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const key = Object.keys(responses).find((k) => url.includes(k))!;
    const r = responses[key];
    return new Response(JSON.stringify(r.body), { status: r.status });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

describe("Paystack adapter", () => {
  it("accepts only correctly signed webhooks", () => {
    const p = createPaystackProvider(SECRET);
    const body = JSON.stringify({ event: "charge.success", data: { reference: "BA-AAAA-BBBB-CCCCCC" } });
    const sig = createHmac("sha512", SECRET).update(body).digest("hex");
    expect(p.parseWebhook(body, new Headers({ "x-paystack-signature": sig }))).toEqual({
      type: "charge.success",
      reference: "BA-AAAA-BBBB-CCCCCC",
    });
    expect(p.parseWebhook(body, new Headers({ "x-paystack-signature": "0".repeat(128) }))).toBeNull();
    expect(p.parseWebhook(body, new Headers())).toBeNull();
    expect(p.parseWebhook(body.replace("BBBB", "XXXX"), new Headers({ "x-paystack-signature": sig }))).toBeNull();
  });

  it("initialises a checkout with the amount in kobo and the secret only in the header", async () => {
    const f = fakeFetch({
      "/transaction/initialize": { status: 200, body: { status: true, data: { authorization_url: "https://checkout.paystack.com/x" } } },
    });
    const p = createPaystackProvider(SECRET, f.fn);
    const r = await p.initialize({
      reference: "BA-AAAA-BBBB-CCCCCC", amountKobo: 1_000_000, currency: "NGN", email: "p@example.com",
      callbackUrl: "https://www.bomasacademy.org/admissions/application?ref=BA-AAAA-BBBB", metadata: {},
    });
    expect(r.checkoutUrl).toBe("https://checkout.paystack.com/x");
    const sent = JSON.parse(String(f.calls[0].init?.body));
    expect(sent).toMatchObject({ amount: 1_000_000, currency: "NGN", reference: "BA-AAAA-BBBB-CCCCCC" });
    expect(String(f.calls[0].init?.body)).not.toContain(SECRET);
  });

  it("maps verification results", async () => {
    const make = (data: object) =>
      createPaystackProvider(SECRET, fakeFetch({ "/transaction/verify/": { status: 200, body: { status: true, data } } }).fn);
    const base = { reference: "R1", amount: 1_000_000, currency: "NGN", paid_at: "2026-11-18T10:00:00Z", id: 42 };
    expect(await make({ ...base, status: "success" }).verify("R1")).toMatchObject({ status: "success", amountKobo: 1_000_000, transactionId: "42" });
    expect((await make({ ...base, status: "failed" }).verify("R1")).status).toBe("failed");
    expect((await make({ ...base, status: "abandoned" }).verify("R1")).status).toBe("abandoned");
    expect((await make({ ...base, status: "ongoing" }).verify("R1")).status).toBe("pending");
    await expect(make({ ...base, reference: "OTHER", status: "success" }).verify("R1")).rejects.toThrow(/mismatch/);
    const unknown = createPaystackProvider(SECRET, fakeFetch({ "/transaction/verify/": { status: 404, body: { status: false, message: "Transaction reference not found" } } }).fn);
    expect((await unknown.verify("R1")).status).toBe("pending");
  });
});
