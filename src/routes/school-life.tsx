import { createFileRoute } from "@tanstack/react-router";
import {
  Clock,
  Shirt,
  Sparkles,
  MessageCircle,
  Users,
  DoorOpen,
  ShieldCheck,
  HeartPulse,
  Globe2,
} from "@/components/icons";
import { useSiteContent } from "@/lib/use-site-content";
import { PageBanner, SubNav } from "@/components/page-parts";
import { Reveal, StaggerItem, StaggerList } from "@/components/motion";
import schoolLifeBannerImg from "@/assets/school-life-banner.jpg";
import schoolLifeHomeworkImg from "@/assets/school-life-homework.jpg";

export const Route = createFileRoute("/school-life")({
  head: () => ({
    meta: [
      { title: "School Life - Bomas Academy" },
      {
        name: "description",
        content:
          "Campus life, the home-school partnership, homework, health & safety, and our home/school agreement.",
      },
      { property: "og:title", content: "School Life - Bomas Academy" },
      {
        property: "og:description",
        content:
          "Campus life, the home-school partnership, homework, health & safety, and our home/school agreement.",
      },
    ],
  }),
  component: SchoolLifePage,
});

type Item = { Icon: React.ComponentType<{ className?: string }>; title: string; body: string };

function SchoolLifePage() {
  const c = useSiteContent();

  const campusItems: Item[] = [
    {
      Icon: Sparkles,
      title: c["schoolLife.campus.environment.title"],
      body: c["schoolLife.campus.environment.body"],
    },
    { Icon: Clock, title: c["schoolLife.campus.day.title"], body: c["schoolLife.campus.day.body"] },
    {
      Icon: Shirt,
      title: c["schoolLife.campus.uniform.title"],
      body: c["schoolLife.campus.uniform.body"],
    },
  ];

  const partnershipItems: Item[] = [
    {
      Icon: MessageCircle,
      title: c["schoolLife.partnership.communication.title"],
      body: c["schoolLife.partnership.communication.body"],
    },
    {
      Icon: Users,
      title: c["schoolLife.partnership.family.title"],
      body: c["schoolLife.partnership.family.body"],
    },
    {
      Icon: DoorOpen,
      title: c["schoolLife.partnership.headteacher.title"],
      body: c["schoolLife.partnership.headteacher.body"],
    },
  ];

  const healthItems: Item[] = [
    {
      Icon: ShieldCheck,
      title: c["schoolLife.health.behaviour.title"],
      body: c["schoolLife.health.behaviour.body"],
    },
    {
      Icon: HeartPulse,
      title: c["schoolLife.health.wellness.title"],
      body: c["schoolLife.health.wellness.body"],
    },
    {
      Icon: Globe2,
      title: c["schoolLife.health.inclusion.title"],
      body: c["schoolLife.health.inclusion.body"],
    },
  ];

  const homeworkBands = (c["schoolLife.homework.bands"] || "")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [stage, time] = line.split("|").map((s) => s.trim());
      return { stage, time };
    });

  const agreementRows = (c["schoolLife.agreement.rows"] || "")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [child, family, school] = line.split("|").map((s) => s.trim());
      return { child, family, school };
    });

  const columns = [
    { key: "child", label: "The child’s promise", tone: "bg-gold text-navy-deep" },
    { key: "family", label: "The family’s promise", tone: "bg-navy text-white" },
    { key: "school", label: "The school’s promise", tone: "bg-navy-deep text-white" },
  ] as const;

  return (
    <>
      <PageBanner
        title={c["schoolLife.title"]}
        intro={c["schoolLife.intro"]}
        image={schoolLifeBannerImg}
      />
      <SubNav
        items={[
          { href: "#campus", label: "Campus" },
          { href: "#partnership", label: "Home-school partnership" },
          { href: "#homework", label: "Homework" },
          { href: "#health", label: "Health and safety" },
          { href: "#agreement", label: "Agreement" },
        ]}
      />

      {/* Campus: three plain columns with a gold rule on top, nothing boxed */}
      <section id="campus" className="container-wide scroll-mt-12 py-12 lg:py-16">
        <h2 className="display-xl max-w-3xl text-[clamp(2.2rem,4.6vw,4rem)] text-navy-deep">
          {c["schoolLife.campus.title"]}
        </h2>
        <StaggerList as="div" className="mt-12 grid gap-10 md:grid-cols-3">
          {campusItems.map(({ Icon, title, body }) => (
            <StaggerItem key={title} as="div" className="border-t-[3px] border-gold pt-5">
              <Icon className="h-6 w-6 text-navy" />
              <h3 className="mt-4 font-display text-2xl font-bold tracking-tight">{title}</h3>
              <p className="mt-3 leading-relaxed text-muted-foreground">{body}</p>
            </StaggerItem>
          ))}
        </StaggerList>
      </section>

      {/* Partnership: navy band, an open-door statement and three notes */}
      <section id="partnership" className="scroll-mt-12 bg-navy-deep text-white">
        <div className="container-wide grid gap-12 py-16 lg:grid-cols-[5fr_7fr] lg:gap-20 lg:py-24">
          <div>
            <h2 className="display-xl text-[clamp(2rem,4vw,3.4rem)]">
              {c["schoolLife.partnership.title"]}
            </h2>
            <p className="mt-5 text-lg text-white/80">{c["schoolLife.partnership.intro"]}</p>
          </div>
          <StaggerList as="ul" className="divide-y divide-white/15 border-y border-white/15">
            {partnershipItems.map(({ Icon, title, body }) => (
              <StaggerItem key={title} className="grid grid-cols-[2.5rem_1fr] gap-4 py-6">
                <Icon className="h-6 w-6 text-gold" />
                <div>
                  <h3 className="font-display text-xl font-bold">{title}</h3>
                  <p className="mt-2 text-white/80">{body}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* Homework: the time bands are the headline */}
      <section id="homework" className="container-wide scroll-mt-12 py-12 lg:py-16">
        <div className="grid items-end gap-8 lg:grid-cols-[6fr_6fr]">
          <div>
            <h2 className="display-xl text-[clamp(2rem,4.2vw,3.6rem)] text-navy-deep">
              {c["schoolLife.homework.title"]}
            </h2>
            <p className="body-copy mt-5 text-muted-foreground">{c["schoolLife.homework.intro"]}</p>
          </div>
          <Reveal direction="left">
            <img
              src={schoolLifeHomeworkImg}
              alt="Students doing homework"
              width={900}
              height={560}
              loading="lazy"
              className="aspect-[16/9] w-full rounded-lg object-cover"
            />
          </Reveal>
        </div>
        {homeworkBands.length > 0 && (
          <StaggerList as="dl" className="mt-10 grid gap-3 md:grid-cols-3">
            {homeworkBands.map((b) => (
              <StaggerItem key={b.stage} as="div" className="rounded-lg bg-gold-soft p-6">
                <dt className="font-display text-base font-semibold text-navy-deep">{b.stage}</dt>
                <dd className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-navy-deep sm:text-4xl">
                  {b.time}
                </dd>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </section>

      {/* Health and safety */}
      <section id="health" className="scroll-mt-12 border-y bg-surface">
        <div className="container-wide py-12 lg:py-16">
          <h2 className="section-title">{c["schoolLife.health.title"]}</h2>
          <StaggerList
            as="div"
            className="mt-10 grid gap-px overflow-clip rounded-lg border bg-border md:grid-cols-3"
          >
            {healthItems.map(({ Icon, title, body }) => (
              <StaggerItem key={title} as="div" className="bg-background p-6 lg:p-8">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-navy text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-display text-xl font-bold">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* Agreement: a three-column ledger, one colour per party */}
      <section id="agreement" className="container-wide scroll-mt-12 py-12 lg:py-16">
        <div className="max-w-2xl">
          <h2 className="section-title">{c["schoolLife.agreement.title"]}</h2>
          <p className="mt-3 text-muted-foreground">{c["schoolLife.agreement.intro"]}</p>
        </div>
        {agreementRows.length > 0 && (
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {columns.map((col) => (
              <div key={col.key} className="overflow-clip rounded-lg border bg-surface">
                <h3 className={`font-display text-lg font-bold ${col.tone} px-5 py-4`}>
                  {col.label}
                </h3>
                <ul>
                  {agreementRows.map((row, i) => (
                    <li
                      key={i}
                      className="border-b px-5 py-4 text-[15px] leading-relaxed last:border-b-0"
                    >
                      {row[col.key]}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
