import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { ADMISSION_FAQS } from "@/lib/admission-faqs";
import { ArrowRight, FileText, Phone } from "@/components/icons";
import { useSiteContent } from "@/lib/use-site-content";
import { PaperHeader } from "@/components/page-parts";
import { DrawLine, Reveal, StaggerItem, StaggerList } from "@/components/motion";
import admissionsImg from "@/assets/admissions-featured.jpg";

export const Route = createFileRoute("/admissions")({
  head: () =>
    pageHead({
      title: "Admissions | How to Apply to Bomas Academy, Jos | Nursery to SSS",
      description:
        "How to apply to Bomas Academy in G.R.A, Jos: apply online, entrance assessment, campus visits and answers to common parent questions. Early Years to SSS 3.",
      path: "/admissions",
      image: admissionsImg,
      breadcrumbs: [{ name: "Admissions", path: "/admissions" }],
      jsonLd: [
        {
          "@type": "FAQPage",
          "@id": "https://www.bomasacademy.org/admissions#faq",
          mainEntity: ADMISSION_FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        },
      ],
    }),
  component: AdmissionsPage,
});

function AdmissionsPage() {
  const c = useSiteContent();
  const steps = (c["admissions.steps"] || "").split("\n").filter(Boolean);
  return (
    <>
      <PaperHeader trail="Admissions" title={c["admissions.title"]} intro={c["admissions.intro"]} />

      {/* The path: a drawn line with one stop per step */}
      <section className="container-wide py-10 lg:py-16">
        {steps.length > 0 ? (
          <>
            <DrawLine className="hidden h-[3px] bg-gold lg:block" />
            <StaggerList
              as="ol"
              className="grid gap-0 lg:grid-cols-[repeat(var(--n),minmax(0,1fr))] lg:gap-6"
              style={{ "--n": steps.length } as React.CSSProperties}
            >
              {steps.map((s, i) => (
                <StaggerItem
                  key={i}
                  className="relative grid grid-cols-[3.5rem_1fr] gap-4 border-l-[3px] border-gold py-6 pl-5 lg:grid-cols-1 lg:border-l-0 lg:py-0 lg:pl-0 lg:pt-10"
                >
                  <span className="font-display text-6xl font-bold leading-[0.85] tracking-[-0.05em] text-navy-deep lg:text-7xl">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="font-display text-xl font-semibold leading-snug lg:mt-4 lg:max-w-xs">
                    {s.replace(/^\d+\.\s*/, "")}
                  </p>
                </StaggerItem>
              ))}
            </StaggerList>
          </>
        ) : (
          <p className="text-muted-foreground">
            Admission steps will appear here soon. Please contact the school office.
          </p>
        )}
      </section>

      {/* Contact the office */}
      <section className="bg-navy-deep text-white">
        <div className="container-wide grid items-center gap-10 py-14 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:py-20">
          <Reveal direction="right">
            <img
              src={admissionsImg}
              alt="Bomas Academy students"
              width={900}
              height={600}
              loading="lazy"
              className="aspect-[3/2] w-full rounded-lg object-cover"
            />
          </Reveal>
          <div>
            <h2 className="display-xl text-[clamp(2rem,4.4vw,3.8rem)]">{c["admissions.cta"]}</h2>
            {c["admissions.phone"] && (
              <a
                href={`tel:${c["admissions.phone"]}`}
                className="mt-6 inline-flex min-h-11 items-center gap-3 font-display text-3xl font-bold tracking-tight text-gold sm:text-4xl"
              >
                <Phone className="h-6 w-6" aria-hidden="true" />
                {c["admissions.phone"]}
              </a>
            )}
            <p className="mt-6 max-w-md text-white/80">
              Apply online in about 20 minutes: complete the Admission Form and Class Form, upload your child's
              passport photograph and birth certificate, and pay the application fee. No account needed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/admissions/apply"
                className="press inline-flex h-12 items-center gap-2 rounded-md bg-gold px-6 font-display text-[15px] font-semibold text-navy-deep hover:-translate-y-px"
              >
                Apply online <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/contact"
                className="press inline-flex h-12 items-center gap-2 rounded-md border border-white/40 px-6 font-display text-[15px] font-semibold hover:bg-white/10"
              >
                Contact admissions
              </Link>
              <Link
                to="/downloads"
                className="press inline-flex h-12 items-center gap-2 rounded-md border border-white/40 px-6 font-display text-[15px] font-semibold hover:bg-white/10"
              >
                <FileText className="h-4 w-4" aria-hidden="true" /> Forms and downloads
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Questions parents ask. The same list feeds the FAQPage structured data. */}
      <section className="container-wide py-14 lg:py-20" aria-labelledby="admissions-faq">
        <h2 id="admissions-faq" className="section-title">
          Questions parents ask
        </h2>
        <div className="mt-8 divide-y border-y">
          {ADMISSION_FAQS.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6">
                <h3 className="font-display text-lg font-semibold leading-snug">{f.q}</h3>
                <span
                  aria-hidden="true"
                  className="font-display text-2xl leading-none text-navy transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="body-copy mt-3 max-w-3xl text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
