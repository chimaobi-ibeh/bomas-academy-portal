import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PaperHeader } from "@/components/page-parts";
import { DownloadButtons } from "@/components/admissions/downloads";
import { CircleAlert, Loader2, Lock } from "@/components/icons";
import { getAdmissionStatus } from "@/lib/api/admissions.functions";
import { tokenFromHash } from "@/lib/admissions/pending";
import { formatNaira } from "@/lib/admissions/format";
import type { ApplicationView } from "@/lib/admissions/service.server";

// Opened from the school's notification email. The private school token is in the URL
// fragment, which browsers never send to the server.
export const Route = createFileRoute("/admissions_/office")({
  validateSearch: (s: Record<string, unknown>) => ({ ref: typeof s.ref === "string" ? s.ref.slice(0, 20) : "" }),
  head: () => ({
    meta: [
      { title: "Application Documents | Bomas Academy" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: OfficePage,
});

function OfficePage() {
  const { ref } = Route.useSearch();
  const [token, setToken] = useState("");
  const [app, setApp] = useState<ApplicationView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = tokenFromHash();
    setToken(t);
    if (!ref || !t) {
      setError("Open this page from the link in the notification email.");
      return;
    }
    getAdmissionStatus({ data: { reference: ref, token: t, audience: "school" } })
      .then((res) => (res.ok ? setApp(res.application) : setError(res.message)))
      .catch(() => setError("The application system could not be reached. Please try again shortly."));
  }, [ref]);

  return (
    <>
      <PaperHeader trail="Admissions / School office" title="Application documents." intro={ref ? `Reference ${ref}` : undefined} />
      <section className="container-read py-10 lg:py-14">
        <p className="mb-6 flex gap-2 rounded-md border border-navy/20 bg-navy/5 px-4 py-3 text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden="true" />
          For Bomas Academy staff only. These documents contain children's personal and health information. Please do
          not forward this link.
        </p>
        {error && (
          <p role="alert" className="flex items-center gap-2 text-destructive">
            <CircleAlert className="h-5 w-5" aria-hidden="true" /> {error}
          </p>
        )}
        {!error && !app && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading...
          </p>
        )}
        {app && (
          <div className="grid gap-8">
            <dl className="grid gap-x-8 gap-y-3 rounded-lg border bg-surface p-6 sm:grid-cols-2">
              {[
                ["Student", app.studentName],
                ["Parent / guardian", app.parentName],
                ["Class applied for", app.classApplied],
                ["Status", app.status === "SUBMITTED" ? "Submitted and paid" : "Not paid"],
                ["Amount", formatNaira(app.feeKobo)],
                ["Receipt number", app.receiptNumber ?? "-"],
                ["Submitted", app.submittedAt ? new Date(app.submittedAt).toLocaleString("en-GB", { timeZone: "Africa/Lagos" }) : "-"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-sm text-muted-foreground">{k}</dt>
                  <dd className="font-display font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            {app.status === "SUBMITTED" && (
              <DownloadButtons
                reference={app.reference}
                token={token}
                audience="school"
                kinds={["admission-form", "class-form", "receipt", "passport", "birth-certificate", "all"]}
              />
            )}
          </div>
        )}
      </section>
    </>
  );
}
