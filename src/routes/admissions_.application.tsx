import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { PaperHeader } from "@/components/page-parts";
import { DownloadButtons } from "@/components/admissions/downloads";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CircleAlert, Clock, Loader2, Lock } from "@/components/icons";
import { getAdmissionStatus, startAdmissionPayment } from "@/lib/api/admissions.functions";
import { loadPending, savePending, tokenFromHash } from "@/lib/admissions/pending";
import { PAYMENT_DISCLAIMER } from "@/lib/admissions/original-text";
import { formatNaira } from "@/lib/admissions/format";
import type { ApplicationView } from "@/lib/admissions/service.server";

export const Route = createFileRoute("/admissions_/application")({
  validateSearch: (s: Record<string, unknown>) => ({
    ref: typeof s.ref === "string" ? s.ref.slice(0, 20) : "",
    // Paystack adds these when it sends the parent back; they only mean "check now".
    reference: typeof s.reference === "string" ? s.reference.slice(0, 60) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Your Application | Bomas Academy" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: ApplicationPage,
});

type State =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "error"; message: string }
  | { kind: "ready"; app: ApplicationView };

function ApplicationPage() {
  const { ref, reference: returnedFromPayment } = Route.useSearch();
  const [token, setToken] = useState("");
  const [state, setState] = useState<State>({ kind: "loading" });
  const [paying, setPaying] = useState(false);
  const polls = useRef(0);

  const check = useCallback(
    async (t: string) => {
      const res = await getAdmissionStatus({ data: { reference: ref, token: t, audience: "parent" } }).catch(() => null);
      if (!res) return setState({ kind: "error", message: "We could not reach the school's system. Please check your connection and try again." });
      if (!res.ok) return setState({ kind: "error", message: res.message });
      setState({ kind: "ready", app: res.application });
      return res.application;
    },
    [ref],
  );

  useEffect(() => {
    const t = tokenFromHash() || loadPending(ref)?.token || "";
    if (!ref || !t) {
      setState({ kind: "missing" });
      return;
    }
    setToken(t);
    savePending({ reference: ref, token: t });
    void (async () => {
      const app = await check(t);
      // Just back from the payment page: the confirmation can take a few seconds.
      if (returnedFromPayment && app && app.status !== "SUBMITTED" && app.payment === "pending") {
        const timer = setInterval(async () => {
          polls.current++;
          const again = await check(t);
          if (!again || again.status === "SUBMITTED" || again.payment !== "pending" || polls.current >= 6) clearInterval(timer);
        }, 4000);
      }
    })();
  }, [ref, returnedFromPayment, check]);

  async function pay() {
    setPaying(true);
    const res = await startAdmissionPayment({ data: { reference: ref, token } }).catch(() => null);
    if (!res) {
      setPaying(false);
      return setState({ kind: "error", message: "We could not reach the school's system. Nothing has been charged. Please try again." });
    }
    if (!res.ok) {
      setPaying(false);
      return setState({ kind: "error", message: res.message });
    }
    if (res.status === "SUBMITTED") {
      setPaying(false);
      return void check(token);
    }
    window.location.assign(res.checkoutUrl);
  }

  return (
    <>
      <PaperHeader trail="Admissions / Your application" title="Your application." intro={ref ? `Reference ${ref}` : undefined} />
      <section className="container-read py-10 lg:py-14" aria-live="polite">
        {state.kind === "loading" && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Checking your application...
          </p>
        )}
        {state.kind === "missing" && (
          <Notice icon={<CircleAlert className="h-6 w-6 text-navy" />} title="Open the link from your email">
            To see an application, use the link in the confirmation email, or open this page on the device you applied
            from. Need help? Contact the school office.
          </Notice>
        )}
        {state.kind === "error" && (
          <Notice icon={<CircleAlert className="h-6 w-6 text-destructive" />} title="Something went wrong">
            <p>{state.message}</p>
            <Button className="mt-4" variant="outline" onClick={() => { setState({ kind: "loading" }); void check(token); }}>
              Try again
            </Button>
          </Notice>
        )}
        {state.kind === "ready" && <Ready app={state.app} token={token} paying={paying} onPay={pay} onCheck={() => void check(token)} />}
      </section>
    </>
  );
}

function Notice({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-surface p-6 sm:p-8">
      <div className="flex items-center gap-3">
        {icon}
        <h2 className="section-title">{title}</h2>
      </div>
      <div className="mt-3 text-[15px] text-muted-foreground">{children}</div>
    </div>
  );
}

function Ready({ app, token, paying, onPay, onCheck }: { app: ApplicationView; token: string; paying: boolean; onPay: () => void; onCheck: () => void }) {
  useEffect(() => {
    if (app.status === "SUBMITTED") {
      try {
        sessionStorage.removeItem("bomas-admission-draft-v1");
      } catch {
        /* ignore */
      }
    }
  }, [app.status]);

  if (app.status === "SUBMITTED") {
    return (
      <div className="grid gap-8">
        <div className="rounded-lg bg-navy-deep p-6 text-white sm:p-8">
          <CheckCircle2 className="h-10 w-10 text-gold" aria-hidden="true" />
          <h2 className="display-xl mt-3 text-[clamp(1.8rem,4vw,2.6rem)]">Application submitted.</h2>
          <p className="mt-3 text-white/85">
            Thank you. We have received the application for <b>{app.studentName}</b> ({app.classApplied}) and your
            payment of {formatNaira(app.feeKobo)} has been confirmed. A confirmation email is on its way to you.
          </p>
          <dl className="mt-5 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="text-white/60">Application reference</dt><dd className="font-mono text-base">{app.reference}</dd></div>
            <div><dt className="text-white/60">Receipt number</dt><dd className="font-mono text-base">{app.receiptNumber}</dd></div>
          </dl>
          {app.testMode && <p className="mt-4 text-sm font-semibold text-gold">Test mode: no real money was taken.</p>}
        </div>
        <div>
          <h2 className="section-title">Download your documents</h2>
          <p className="mt-2 text-muted-foreground">Save them now. The link in your email also lets you download them later.</p>
          <div className="mt-5">
            <DownloadButtons reference={app.reference} token={token} audience="parent" kinds={["receipt", "admission-form", "class-form", "all"]} />
          </div>
        </div>
        <div className="rounded-lg border bg-surface p-6">
          <h2 className="font-display text-lg font-bold">Next: bring these to the school office when the school calls you in</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px]">
            {app.toBring.map((b) => <li key={b}>{b}</li>)}
          </ul>
          <p className="mt-4 text-[15px] font-semibold">{PAYMENT_DISCLAIMER}</p>
          <p className="mt-1 text-[15px] text-muted-foreground">The school will contact you about the next steps.</p>
        </div>
      </div>
    );
  }

  if (app.payment === "failed") {
    return (
      <Notice icon={<CircleAlert className="h-6 w-6 text-destructive" />} title="The payment did not go through">
        <p>Your answers and documents are saved, but the application has not been submitted. You have not been charged for the failed attempt.</p>
        <Button className="mt-5" variant="gold" size="lg" onClick={onPay} disabled={paying}>
          <Lock aria-hidden="true" /> {paying ? "Opening the payment page..." : `Try payment again (${formatNaira(app.feeKobo)})`}
        </Button>
      </Notice>
    );
  }

  if (app.payment === "pending") {
    return (
      <Notice icon={<Clock className="h-6 w-6 text-navy" />} title="Waiting for payment confirmation">
        <p>
          We have not received confirmation of your payment yet. If you have just paid, this usually takes less than a
          minute. <b>If money has left your account, please do not pay again:</b> the payment will be confirmed
          automatically and you will receive an email.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="outline" size="lg" onClick={onCheck}>Check again</Button>
          <Button variant="gold" size="lg" onClick={onPay} disabled={paying}>
            <Lock aria-hidden="true" /> {paying ? "Opening the payment page..." : "I have not paid yet: pay now"}
          </Button>
        </div>
      </Notice>
    );
  }

  return (
    <Notice icon={<Lock className="h-6 w-6 text-navy" />} title="Payment needed to submit">
      <p>Your application {app.reference} for {app.studentName} is saved but has not been submitted. Pay the application fee to complete it.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button variant="gold" size="lg" onClick={onPay} disabled={paying}>
          <Lock aria-hidden="true" /> {paying ? "Opening the payment page..." : `Pay ${formatNaira(app.feeKobo)}`}
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/admissions/apply">Start a new application</Link>
        </Button>
      </div>
    </Notice>
  );
}
