import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "@/components/icons";
import { useSiteContent } from "@/lib/use-site-content";
import { PageBanner, SubNav } from "@/components/page-parts";
import { ParallaxImage, Reveal } from "@/components/motion";
import classroomImg from "@/assets/classroom.jpg";
import academicEarlyImg from "@/assets/academic-early.webp";
import academicPrimaryImg from "@/assets/academic-primary.webp";
import academicSecondaryImg from "@/assets/academic-secondary.webp";

export const Route = createFileRoute("/academics")({
  head: () => ({
    meta: [
      { title: "Academics - Bomas Academy" },
      {
        name: "description",
        content:
          "From early years to senior secondary, our curriculum challenges, supports and stretches every learner.",
      },
      { property: "og:title", content: "Academics - Bomas Academy" },
      {
        property: "og:description",
        content:
          "From early years to senior secondary, our curriculum challenges, supports and stretches every learner.",
      },
    ],
  }),
  component: AcademicsPage,
});

function AcademicsPage() {
  const c = useSiteContent();
  const stages = [
    {
      id: "early",
      title: c["academics.early.title"],
      body: c["academics.early.body"],
      image: academicEarlyImg,
    },
    {
      id: "primary",
      title: c["academics.primary.title"],
      body: c["academics.primary.body"],
      image: academicPrimaryImg,
    },
    {
      id: "secondary",
      title: c["academics.secondary.title"],
      body: c["academics.secondary.body"],
      image: academicSecondaryImg,
    },
  ];
  return (
    <>
      <PageBanner title={c["academics.title"]} intro={c["academics.intro"]} image={classroomImg} />
      <SubNav items={stages.map((s) => ({ href: `#${s.id}`, label: s.title }))} />

      {/* Three chapters, each a full-bleed half photograph and a half of type */}
      {stages.map((s, i) => (
        <section
          key={s.id}
          id={s.id}
          className={`scroll-mt-12 grid min-h-[52svh] overflow-x-clip lg:grid-cols-2 ${i === 1 ? "bg-navy-deep text-white" : i === 2 ? "bg-gold-soft" : "bg-surface"}`}
        >
          <Reveal
            direction={i % 2 === 0 ? "right" : "left"}
            className={`min-h-[260px] lg:min-h-full ${i % 2 === 1 ? "lg:order-2" : ""}`}
          >
            <ParallaxImage
              src={s.image}
              alt={s.title}
              width={1000}
              height={900}
              loading={i === 0 ? "eager" : "lazy"}
              className="h-full min-h-[260px] w-full"
              amount={5}
            />
          </Reveal>
          <div
            className={`flex flex-col justify-center px-[max(1.125rem,calc((100vw-84rem)/2+2.5rem))] py-10 lg:py-14 ${i % 2 === 1 ? "lg:order-1" : ""}`}
          >
            <Reveal className="max-w-xl">
              <h2 className="display-xl text-[clamp(2.4rem,5vw,4.4rem)]">{s.title}</h2>
              {s.body ? (
                <p className="body-copy mt-6 whitespace-pre-line opacity-85">{s.body}</p>
              ) : (
                <p className="mt-6 opacity-70">
                  Contact the school office to learn more about this stage.
                </p>
              )}
              <Link
                to="/admissions"
                className={`press mt-8 inline-flex h-11 items-center gap-2 rounded-md px-5 font-display text-sm font-semibold ${
                  i === 1
                    ? "bg-gold text-navy-deep hover:brightness-95"
                    : "bg-primary text-primary-foreground hover:bg-navy-deep"
                }`}
              >
                How to apply <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Reveal>
          </div>
        </section>
      ))}
    </>
  );
}
