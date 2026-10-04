import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, VALUE_ICONS } from "@/components/icons";
import { useSiteContent } from "@/lib/use-site-content";
import { VALUE_LETTERS } from "@/lib/values";
import { PageBanner } from "@/components/page-parts";
import { EASE, ParallaxImage, Reveal, StaggerItem, StaggerList } from "@/components/motion";
import aboutSlide1 from "@/assets/about-slide-1.jpg";
import aboutSlide2 from "@/assets/about-slide-2.jpg";
import aboutSlide3 from "@/assets/about-slide-3.jpg";
import aboutMissionImg from "@/assets/about-mission.jpg";
import aboutAimsImg from "@/assets/about-aims.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About - Bomas Academy" },
      {
        name: "description",
        content:
          "The story behind Bomas Academy, and the mission and vision guiding our school for the children of Jos.",
      },
      { property: "og:title", content: "About - Bomas Academy" },
      {
        property: "og:description",
        content:
          "The story behind Bomas Academy, and the mission and vision guiding our school for the children of Jos.",
      },
    ],
  }),
  component: AboutPage,
});

const ALL_SECTIONS = [
  { id: "story", label: "Our story" },
  { id: "purpose", label: "Mission and vision" },
  { id: "values", label: "The BOMAS values" },
  { id: "aims", label: "Aims and objectives" },
];

/** Sticky chapter index: the active chapter follows the scroll position. */
function ChapterIndex({ hasPurpose }: { hasPurpose: boolean }) {
  const SECTIONS = useMemo(
    () => ALL_SECTIONS.filter((s) => hasPurpose || s.id !== "purpose"),
    [hasPurpose],
  );
  const [active, setActive] = useState(SECTIONS[0].id);
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.2, 0.6] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [SECTIONS]);
  return (
    <nav aria-label="Chapters" className="hidden lg:block">
      <ul className="sticky top-28 space-y-1 border-l">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? "location" : undefined}
              className={`-ml-px flex min-h-11 items-center border-l-[3px] pl-4 font-display text-sm font-semibold transition-colors ${
                active === s.id
                  ? "border-gold text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function AboutPage() {
  const c = useSiteContent();
  const values = Object.entries(VALUE_LETTERS).map(([key, letter]) => {
    const [title, body, motto] = (c[`about.values.${key}`] || "").split("\n");
    return { key, letter, title, body, motto };
  });
  const aims = (c["about.aims.items"] || "").split("\n").filter(Boolean);
  const hasPurpose = c["about.mission"] || c["about.vision"];

  return (
    <>
      <PageBanner title={c["about.title"]} image={aboutSlide2} />

      <div className="container-wide grid gap-10 py-14 lg:grid-cols-[14rem_1fr] lg:gap-16 lg:py-24">
        <ChapterIndex hasPurpose={Boolean(hasPurpose)} />

        <div className="min-w-0 space-y-12 lg:space-y-16">
          {/* Story: lead paragraph set large, photographs beside it */}
          <section id="story" className="scroll-mt-28">
            <h2 className="section-title">A school grown on the plateau.</h2>
            {c["about.story"] && (
              <p className="mt-6 max-w-3xl whitespace-pre-line font-display text-xl font-medium leading-[1.45] tracking-[-0.01em] text-foreground/90 sm:text-2xl">
                {c["about.story"]}
              </p>
            )}
            <Reveal className="mt-10 grid grid-cols-6 gap-3">
              <ParallaxImage
                src={aboutSlide1}
                alt="Bomas Academy students embracing joyfully on the playground"
                width={900}
                height={560}
                className="col-span-6 aspect-[16/9] w-full rounded-lg sm:col-span-4 sm:aspect-auto sm:h-full"
              />
              <div className="col-span-6 grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-1">
                <img
                  src={aboutSlide3}
                  alt="Bomas Academy students laughing together on the playground railing"
                  width={600}
                  height={450}
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-lg object-cover"
                />
                <img
                  src={aboutAimsImg}
                  alt="Bomas Academy students learning"
                  width={600}
                  height={450}
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-lg object-cover"
                />
              </div>
            </Reveal>
            <Link
              to="/staff"
              className="mt-6 inline-flex min-h-11 items-center gap-2 font-display text-sm font-semibold text-navy hover:underline"
            >
              Meet our staff <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>

          {/* Purpose: pull-quote scale */}
          {hasPurpose && (
            <section id="purpose" className="scroll-mt-28">
              <div className="relative isolate overflow-hidden rounded-lg bg-navy-deep p-7 text-white sm:p-12">
                <img
                  src={aboutMissionImg}
                  alt=""
                  width={1000}
                  height={700}
                  loading="lazy"
                  className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25"
                />
                {c["about.mission"] ? (
                  <>
                    <h2 className="label-mono text-gold">Mission</h2>
                    <p className="mt-4 font-display text-[clamp(1.5rem,3vw,2.6rem)] font-bold leading-[1.15] tracking-[-0.03em]">
                      {c["about.mission"]}
                    </p>
                  </>
                ) : (
                  <h2 className="section-title">Mission and vision</h2>
                )}
                {c["about.vision"] && (
                  <>
                    <h2 className="label-mono mt-10 text-gold">Vision</h2>
                    <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/90">
                      {c["about.vision"]}
                    </p>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Values: each letter is the row */}
          <section id="values" className="scroll-mt-28">
            <h2 className="section-title">The BOMAS values.</h2>
            {c["about.values.intro"] && (
              <p className="mt-3 max-w-xl text-muted-foreground">{c["about.values.intro"]}</p>
            )}
            <StaggerList as="ol" replay className="mt-8 border-t">
              {values.map((v) => (
                <StaggerItem
                  key={v.letter}
                  className="grid grid-cols-[4.5rem_1fr] items-start gap-4 border-b py-6 sm:grid-cols-[8rem_1fr] sm:gap-8 sm:py-8"
                >
                  <span aria-hidden="true" className="mask-line">
                    <motion.span
                      className="block font-display text-[5rem] font-bold leading-[0.8] tracking-[-0.06em] text-gold sm:text-[8rem]"
                      variants={{
                        hidden: { y: "105%", transition: { duration: 0 } },
                        shown: { y: 0, transition: { duration: 0.8, ease: EASE } },
                      }}
                    >
                      {v.letter}
                    </motion.span>
                  </span>
                  <div className="pt-1">
                    <h3 className="flex items-center gap-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-deep text-gold">
                        {(() => {
                          const Icon = VALUE_ICONS[v.key];
                          return Icon ? <Icon className="h-6 w-6" /> : null;
                        })()}
                      </span>
                      {v.title}
                    </h3>
                    {v.body && (
                      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                        {v.body}
                      </p>
                    )}
                    {v.motto && (
                      <p className="mt-3 inline-block rounded-md bg-gold-soft px-3 py-1.5 font-display text-sm font-semibold text-navy-deep">
                        &ldquo;{v.motto}&rdquo;
                      </p>
                    )}
                  </div>
                </StaggerItem>
              ))}
            </StaggerList>
          </section>

          {/* Aims */}
          <section id="aims" className="scroll-mt-28">
            <h2 className="section-title">{c["about.aims.title"]}</h2>
            <StaggerList as="ol" className="mt-8 grid gap-4 sm:grid-cols-2">
              {aims.map((a, i) => (
                <StaggerItem key={i} className="rounded-lg border bg-surface p-6">
                  <span className="font-display text-4xl font-bold leading-none text-gold">
                    {i + 1}
                  </span>
                  <p className="mt-4 text-[17px] leading-relaxed">{a}</p>
                </StaggerItem>
              ))}
            </StaggerList>
          </section>
        </div>
      </div>
    </>
  );
}
