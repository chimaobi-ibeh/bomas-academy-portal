import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  Clock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "@/components/icons";
import { fetchHomeGallery, fetchHomeNews, orNothing } from "@/lib/data";
import { useSiteContent } from "@/lib/use-site-content";
import { VALUE_LETTERS } from "@/lib/values";
import {
  EASE,
  HeroTitle,
  MaskLines,
  Reveal,
  Rise,
  StaggerItem,
  StaggerList,
  splitTitle,
} from "@/components/motion";
import { PhotoTile, SectionHead } from "@/components/page-parts";
import { NewsCard } from "@/components/news-card";
import { BomasLetters } from "@/components/bomas-letters";
import { facilityIcon } from "@/components/icons";
import { SlideControls, SlideLayer, useSlideshow, type HeroSlide } from "@/components/hero-slides";
import missionImg from "@/assets/about-mission.jpg";
import libraryImg from "@/assets/library-enhanced.jpg";
import playgroundImg from "@/assets/playground-enhanced.jpg";
// science.jpg is the photograph of pupils on laptops, so it belongs to ICT.
import ictImg from "@/assets/science-enhanced.jpg";
import classroomImg from "@/assets/classroom.jpg";
import academicEarlyImg from "@/assets/academic-early.webp";
import academicPrimaryImg from "@/assets/academic-primary.webp";
import academicSecondaryImg from "@/assets/academic-secondary.webp";

export const Route = createFileRoute("/")({
  head: () => ({
    // The first hero photograph is the largest thing on screen, so it is asked for at once.
    links: [{ rel: "preload", as: "image", href: academicEarlyImg, fetchPriority: "high" }],
    meta: [
      { title: "Bomas Academy - Jos, Plateau State" },
      {
        name: "description",
        content:
          "Bomas Academy is a nurturing learning community in Jos shaping confident, curious and compassionate young minds from early years through senior secondary.",
      },
      { property: "og:title", content: "Bomas Academy - Jos, Plateau State" },
      {
        property: "og:description",
        content:
          "A nurturing learning community in Jos shaping confident, curious and compassionate young minds.",
      },
    ],
  }),
  loader: async () => {
    const [news, gallery] = await Promise.all([
      orNothing(fetchHomeNews),
      orNothing(fetchHomeGallery),
    ]);
    return { news, gallery };
  },
  component: Index,
});

// Only facilities we hold a true photograph of get a photo tile; the rest sit in the list below.
const FACILITY_IMAGES: [string, string][] = [
  ["library", libraryImg],
  ["ict", ictImg],
  ["computer", ictImg],
  ["sport", playgroundImg],
  ["playground", playgroundImg],
];

function facilityImage(title: string) {
  const t = title.toLowerCase();
  return FACILITY_IMAGES.find(([k]) => t.includes(k))?.[1];
}

// Where each group photograph is anchored when it is cropped, so the faces stay in frame.
const SLIDE_FOCUS: Record<string, string> = {
  early: "50% 30%",
  primary: "50% 30%",
  secondary: "50% 30%",
};

const WHY_ICONS = [BookOpenText, ShieldCheck, MapPin];

function Index() {
  const c = useSiteContent();

  const loaded = Route.useLoaderData();
  const { data: latestNews } = useQuery({
    queryKey: ["news_home"],
    queryFn: fetchHomeNews,
    staleTime: 30_000,
    initialData: loaded.news,
  });

  const { data: gallery } = useQuery({
    queryKey: ["gallery_home"],
    queryFn: fetchHomeGallery,
    staleTime: 30_000,
    initialData: loaded.gallery,
  });

  const why = [1, 2, 3]
    .map((n) => ({ title: c[`home.why.item${n}.title`], body: c[`home.why.item${n}.body`] }))
    .filter((w) => w.title);

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

  // The hero shows the three stage photographs in turn.
  const slides: HeroSlide[] = stages.map((st) => ({
    id: st.id,
    src: st.image,
    label: st.title,
    focus: SLIDE_FOCUS[st.id],
  }));
  const show = useSlideshow(slides.length);

  const values = Object.entries(VALUE_LETTERS).map(([key, letter]) => {
    const [title, , motto] = (c[`about.values.${key}`] || "").split("\n");
    return { key, letter, title, motto };
  });

  const facilities = (c["facilities.items"] || "")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [title, body] = line.split("|").map((s) => s.trim());
      return { title, body };
    });
  const withPhoto = facilities.filter((f) => facilityImage(f.title));
  const facilityTiles = withPhoto.length >= 3 ? withPhoto.slice(0, 3) : facilities.slice(0, 3);
  const facilityRest = facilities.filter((f) => !facilityTiles.includes(f));

  const contact = [
    { Icon: MapPin, label: "Campus", value: c["contact.address"] },
    {
      Icon: Phone,
      label: "Phone",
      value: c["contact.phone"],
      href: `tel:${c["contact.phone"].replace(/\s/g, "")}`,
    },
    {
      Icon: Mail,
      label: "Email",
      value: c["contact.email"],
      href: `mailto:${c["contact.email"]}`,
    },
    { Icon: Clock, label: "Office hours", value: c["contact.hours"] },
  ];

  return (
    <>
      {/* Hero: the stage photographs fill the background, headline in the middle-left */}
      <section className="relative isolate overflow-hidden bg-navy-deep text-white">
        {/* Phones show each photograph whole above the words; from lg up it is the background. */}
        <div className="relative aspect-[3/2] lg:absolute lg:inset-0 lg:aspect-auto">
          <SlideLayer slides={slides} index={show.index} />
          <div className="absolute inset-0 hidden bg-gradient-to-r from-navy-deep/80 from-0% via-navy-deep/40 via-35% to-transparent to-62% lg:block" />
        </div>
        <div className="container-wide relative flex flex-col justify-center pb-24 pt-6 sm:pb-28 lg:h-[min(62vw,860px)] lg:min-h-[560px] lg:py-0 lg:pb-20">
          <SlideControls
            {...show}
            slides={slides}
            className="mb-5 lg:absolute lg:right-8 lg:top-5 lg:z-10 lg:mb-0 lg:rounded-lg lg:bg-navy-deep/70 lg:pl-3 lg:pr-1"
          />
          <div>
            <Rise>
              <p className="label-mono flex items-center gap-3 text-gold">
                <MapPin className="h-5 w-5" />
                {c["home.hero.eyebrow"]}
              </p>
            </Rise>
            <HeroTitle
              lines={[c["home.hero.title"]]}
              className="display-xl mt-4 text-[clamp(2.4rem,9vw,3.4rem)] text-white lg:whitespace-nowrap lg:text-[clamp(2.4rem,3.9vw,4rem)]"
            />
            <Rise
              delay={0.35}
              className="mt-5 max-w-xl text-base text-white/85 sm:text-lg lg:max-w-md"
            >
              <p>{c["home.hero.subtitle"]}</p>
            </Rise>
            <Rise delay={0.5} className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/admissions"
                className="press inline-flex h-12 items-center gap-2 rounded-md bg-gold px-6 font-display text-[15px] font-semibold text-navy-deep hover:-translate-y-px hover:brightness-95"
              >
                Begin admissions <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/about"
                className="press inline-flex h-12 items-center rounded-md border border-white/40 px-6 font-display text-[15px] font-semibold text-white hover:bg-white/10"
              >
                Our story
              </Link>
            </Rise>
          </div>
        </div>
      </section>

      {/* Stage index: one tile per stage, straight into the programme */}
      <section className="container-wide relative z-10 -mt-16 sm:-mt-20">
        <StaggerList as="div" className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {stages.map((s) => (
            <StaggerItem key={s.id} as="div">
              <PhotoTile
                to="/academics"
                hash={s.id}
                title={s.title}
                note={s.body}
                image={s.image}
                focus={SLIDE_FOCUS[s.id]}
                aspect="aspect-[4/3]"
              />
            </StaggerItem>
          ))}
        </StaggerList>
      </section>

      {/* Statement */}
      <section className="container-wide pb-6 pt-14 lg:pb-8 lg:pt-20">
        <MaskLines
          lines={splitTitle(c["home.intro.title"], 30)}
          className="mx-auto max-w-5xl text-balance text-center font-display text-[clamp(1.9rem,4.4vw,3.6rem)] font-bold leading-[1.08] tracking-[-0.035em] text-navy-deep"
        />
        <Reveal delay={0.1}>
          <p className="body-copy mx-auto mt-6 max-w-2xl text-center text-muted-foreground">
            {c["home.intro.body"]}
          </p>
        </Reveal>
        <StaggerList
          as="ol"
          className="mt-10 grid gap-px overflow-clip rounded-lg border bg-border lg:grid-cols-3"
        >
          {why.map((w, i) => (
            <StaggerItem key={w.title} className="bg-surface p-6 sm:p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-gold-soft text-navy-deep">
                {(() => {
                  const Icon = WHY_ICONS[i % WHY_ICONS.length];
                  return <Icon className="h-6 w-6" />;
                })()}
              </span>
              <h3 className="mt-5 font-display text-xl font-bold tracking-tight sm:text-2xl">
                {w.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{w.body}</p>
            </StaggerItem>
          ))}
        </StaggerList>
      </section>

      {/* News: one lead story and a short column (hidden until something is published) */}
      {latestNews && latestNews.length > 0 && (
        <section className="container-wide pt-12 lg:pt-16">
          <SectionHead title="From our newsroom" action={{ to: "/news", label: "All stories" }} />
          <div className="mt-8 grid gap-5 lg:grid-cols-[7fr_5fr]">
            <Reveal>
              <NewsCard post={latestNews[0]} lead />
            </Reveal>
            {latestNews.length > 1 && (
              <div className="grid gap-5 lg:auto-rows-fr">
                {latestNews.slice(1).map((n) => (
                  <Reveal key={n.id}>
                    <NewsCard post={n} compact />
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Purpose: navy panel with the mission set large, photograph in its own column */}
      {(c["about.mission"] || c["about.vision"]) && (
        <section className="mt-12 overflow-hidden bg-navy-deep text-white lg:mt-16">
          <div className="grid lg:grid-cols-2">
            <div className="px-[1.125rem] py-12 sm:px-6 lg:py-20 lg:pl-[max(2.5rem,calc((100vw-84rem)/2+2.5rem))] lg:pr-14">
              {c["about.mission"] && (
                <>
                  <p className="label-mono text-gold">Our mission</p>
                  <p className="mt-4 font-display text-[clamp(1.6rem,2.8vw,2.6rem)] font-bold leading-[1.12] tracking-[-0.03em]">
                    {c["about.mission"]}
                  </p>
                </>
              )}
              {c["about.vision"] && (
                <>
                  <p className="label-mono mt-12 text-gold">Our vision</p>
                  <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/85">
                    {c["about.vision"]}
                  </p>
                </>
              )}
              <Link
                to="/about"
                className="press mt-10 inline-flex h-11 items-center gap-2 rounded-md border border-white/40 px-5 font-display text-sm font-semibold hover:bg-white/10"
              >
                About Bomas <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="relative hidden min-h-[28rem] lg:block">
              <img
                src={missionImg}
                alt=""
                width={1400}
                height={900}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </div>
        </section>
      )}

      {/* Values: giant letters on gold */}
      <section className="bg-gold text-navy-deep">
        <div className="container-wide py-10 lg:py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="section-title">{c["home.values.title"]}</h2>
            <Link
              to="/about"
              hash="values"
              className="press inline-flex h-10 items-center gap-2 rounded-md border border-navy-deep/40 px-3.5 font-display text-sm font-semibold hover:bg-navy-deep hover:text-white"
            >
              Read the values <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <BomasLetters values={values} />
        </div>
      </section>

      {/* Campus: photo tiles for the first three, the rest as a quiet list */}
      {facilities.length > 0 && (
        <section className="container-wide py-12 lg:py-20">
          <SectionHead
            title={c["facilities.title"]}
            action={{ to: "/facilities", label: "All facilities" }}
          />
          <StaggerList as="div" className="mt-8 grid gap-4 md:grid-cols-3">
            {facilityTiles.map((f) => (
              <StaggerItem key={f.title} as="div">
                <PhotoTile
                  to="/facilities"
                  title={f.title}
                  note={f.body}
                  image={facilityImage(f.title) ?? classroomImg}
                  aspect="aspect-[16/10] md:aspect-[4/5]"
                />
              </StaggerItem>
            ))}
          </StaggerList>
          {facilityRest.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2">
              {facilityRest.map((f) => (
                <li
                  key={f.title}
                  className="flex items-center gap-2 rounded-md border bg-surface py-2 pl-2.5 pr-3.5 font-display text-sm font-semibold transition-colors hover:border-navy/40 hover:bg-muted"
                >
                  {(() => {
                    const Icon = facilityIcon(f.title);
                    return <Icon className="h-5 w-5 text-navy" />;
                  })()}
                  {f.title}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Gallery: one large photograph with four around it, the last tile leading on */}
      {gallery && gallery.length > 0 && (
        <section className="container-wide pb-12 lg:pb-20">
          <SectionHead
            title={c["home.gallery.title"]}
            action={{ to: "/gallery", label: "View gallery" }}
          />
          <StaggerList
            as="div"
            className="mt-8 grid grid-cols-2 gap-3 lg:h-[30rem] lg:grid-cols-4 lg:grid-rows-2 lg:gap-4"
          >
            {gallery.map((img, i) => {
              const isLast = i === gallery.length - 1 && gallery.length > 1;
              return (
                <StaggerItem
                  key={img.id}
                  as="div"
                  className={i === 0 ? "col-span-2 lg:row-span-2" : ""}
                >
                  <Link
                    to="/gallery"
                    aria-label={isLast ? "See all photos in the gallery" : "Open the gallery"}
                    className={`group relative block h-full overflow-hidden rounded-lg bg-secondary ${
                      i === 0 ? "aspect-[4/3] lg:aspect-auto" : "aspect-square lg:aspect-auto"
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt={img.title ?? ""}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                    />
                    {isLast && (
                      <span className="absolute inset-0 flex flex-col items-start justify-end bg-gradient-to-t from-navy-deep/90 via-navy-deep/50 to-navy-deep/10 p-4 text-white sm:p-5">
                        <span className="font-display text-lg font-bold leading-tight tracking-tight sm:text-xl">
                          See all photos
                        </span>
                        <span className="mt-2 flex h-9 w-9 items-center justify-center rounded-md bg-gold text-navy-deep transition-transform group-hover:translate-x-0.5">
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </span>
                    )}
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerList>
        </section>
      )}

      {/* Admissions: the one loud call to action */}
      <section className="container-wide">
        <div className="rounded-lg border-b-[6px] border-gold bg-navy-deep p-7 text-white sm:p-12 lg:p-16">
          <MaskLines
            lines={["Bring your child to a", "school that sees them."]}
            className="display-xl max-w-4xl text-[clamp(2.2rem,5.6vw,4.8rem)]"
          />
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/admissions"
              className="press inline-flex h-12 items-center gap-2 rounded-md bg-gold px-6 font-display text-[15px] font-semibold text-navy-deep hover:-translate-y-px hover:brightness-95"
            >
              Start admissions <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <p className="max-w-sm text-sm text-white/75">
              Book a campus visit, meet our teachers, and learn how Bomas Academy nurtures every
              learner.
            </p>
          </div>
        </div>

        <ul className="mb-10 mt-4 grid gap-px overflow-clip rounded-lg border bg-border sm:grid-cols-2 lg:mb-12 lg:grid-cols-4 [&>li]:bg-surface">
          {contact.map(({ Icon, label, value, href }) => (
            <li key={label} className="flex gap-4 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-secondary text-navy">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="label-mono text-muted-foreground">{label}</p>
                {href ? (
                  <a
                    href={href}
                    className="mt-0.5 flex min-h-11 items-center break-words font-display text-base font-semibold hover:underline"
                  >
                    {value}
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                ) : (
                  <p className="mt-1 whitespace-pre-line font-display text-base font-semibold">
                    {value}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
