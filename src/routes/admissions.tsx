import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileText, Phone } from "@/components/icons";
import { useSiteContent } from "@/lib/use-site-content";
import { PaperHeader } from "@/components/page-parts";
import { DrawLine, Reveal, StaggerItem, StaggerList } from "@/components/motion";
import admissionsImg from "@/assets/admissions-featured.jpg";

export const Route = createFileRoute("/admissions")({
  head: () => ({
    meta: [
      { title: "Admissions - Bomas Academy" },
      {
        name: "description",
        content: "Five simple steps to join the Bomas Academy family in Jos.",
      },
      { property: "og:title", content: "Admissions - Bomas Academy" },
      {
        property: "og:description",
        content: "Five simple steps to join the Bomas Academy family in Jos.",
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
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/contact"
                className="press inline-flex h-12 items-center gap-2 rounded-md bg-gold px-6 font-display text-[15px] font-semibold text-navy-deep hover:-translate-y-px"
              >
                Contact admissions <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
    </>
  );
}
