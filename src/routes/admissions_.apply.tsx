import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PaperHeader } from "@/components/page-parts";
import { ApplyWizard } from "@/components/admissions/apply-wizard";
import { getAdmissionsInfo } from "@/lib/api/admissions.functions";
import { loadPending, type PendingApplication } from "@/lib/admissions/pending";
import { useSiteContent } from "@/lib/use-site-content";
import { ArrowRight, Phone } from "@/components/icons";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/admissions_/apply")({
  head: () =>
    pageHead({
      title: "Apply Online | Bomas Academy Admissions, Jos",
      description:
        "Apply to Bomas Academy online: complete the Admission Form and Class Form, upload your child's passport photograph and birth certificate, and pay the application fee securely.",
      path: "/admissions/apply",
      breadcrumbs: [
        { name: "Admissions", path: "/admissions" },
        { name: "Apply online", path: "/admissions/apply" },
      ],
    }),
  loader: async () => {
    try {
      return await getAdmissionsInfo();
    } catch (e) {
      console.error("[admissions] could not load settings", (e as Error)?.message);
      return { enabled: false, feeKobo: null, testMode: false };
    }
  },
  component: ApplyPage,
});

function ApplyPage() {
  const info = Route.useLoaderData();
  const c = useSiteContent();
  const [pending, setPending] = useState<PendingApplication | null>(null);
  useEffect(() => setPending(loadPending()), []);

  return (
    <>
      <PaperHeader
        trail="Admissions / Apply online"
        title="Apply online."
        intro="No account needed. It takes about 20 minutes. Have your child's passport photograph and birth certificate ready."
      />
      <section className="container-wide grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-14 lg:py-14">
        <div className="min-w-0">
          {pending && (
            <div className="mb-8 rounded-lg border border-navy/25 bg-navy/5 p-5">
              <p className="font-display font-semibold">You started an application on this device ({pending.reference}).</p>
              <p className="mt-1 text-sm text-muted-foreground">
                If you have already paid, do not pay again: check its status first.
              </p>
              <Link
                to="/admissions/application"
                search={{ ref: pending.reference, reference: undefined }}
                hash={`t=${pending.token}`}
                className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-display text-sm font-semibold text-navy underline"
              >
                Check that application <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          )}
          {info.enabled ? (
            <ApplyWizard info={info} />
          ) : (
            <div className="rounded-lg border bg-surface p-6 sm:p-8">
              <h2 className="section-title">Online applications are opening soon</h2>
              <p className="mt-3 text-muted-foreground">
                The online application is not open yet. In the meantime, please contact the admissions office or visit
                the school to collect the forms.
              </p>
              {c["admissions.phone"] && (
                <a href={`tel:${c["admissions.phone"]}`} className="mt-5 inline-flex min-h-11 items-center gap-2 font-display text-2xl font-bold text-navy-deep">
                  <Phone className="h-5 w-5" aria-hidden="true" /> {c["admissions.phone"]}
                </a>
              )}
            </div>
          )}
        </div>
        <aside className="h-fit rounded-lg bg-secondary p-6 text-[15px] lg:sticky lg:top-28">
          <h2 className="font-display text-lg font-bold">What you will need</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>Parents' contact details and occupations</li>
            <li>Your child's present school details (if any)</li>
            <li>Your child's health and immunisation history</li>
            <li>A passport photograph of your child (JPG or PNG)</li>
            <li>A scan or clear photo of the birth certificate</li>
            <li>A debit card or bank account to pay the fee</li>
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            Your answers are kept in this browser tab until you submit, so you can go back and change them.
          </p>
        </aside>
      </section>
    </>
  );
}
