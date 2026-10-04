import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Compass, Inbox, type LucideIcon } from "@/components/icons";
import { HeroTitle, Rise, splitTitle } from "@/components/motion";
import { cn } from "@/lib/utils";

/**
 * Inner-page banner. With an image: photo-led, title bottom-left over a navy wash.
 * Without: a plain navy banner. Never invents imagery.
 */
export function PageBanner({
  title,
  intro,
  image,
  className,
}: {
  title: string;
  intro?: string;
  image?: string;
  className?: string;
}) {
  return (
    <section className={cn("relative isolate overflow-hidden bg-navy-deep text-white", className)}>
      {image && (
        <>
          <img
            src={image}
            alt=""
            width={1600}
            height={600}
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-deep via-navy-deep/55 to-navy-deep/20" />
        </>
      )}
      <div className="container-wide flex min-h-[170px] flex-col justify-end pb-6 pt-10 sm:min-h-[210px] lg:min-h-[250px] lg:pb-9">
        <HeroTitle lines={splitTitle(title, 26)} className="page-title max-w-4xl text-white" />
        {intro && (
          <Rise delay={0.25} className="mt-4 max-w-2xl text-base text-white/80 sm:text-lg">
            <p>{intro}</p>
          </Rise>
        )}
      </div>
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-gold" />
    </section>
  );
}

/**
 * Paper header: giant type on the ivory page, a gold block and a mono trail.
 * For pages that lead with words rather than a photograph.
 */
export function PaperHeader({
  trail,
  title,
  intro,
  children,
}: {
  trail: string;
  title: string;
  intro?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b">
      <div className="container-wide pb-8 pt-8 lg:pb-10 lg:pt-12">
        <p className="label-mono flex items-center gap-3 text-muted-foreground">
          <Compass className="h-5 w-5 text-gold" />
          Bomas Academy / {trail}
        </p>
        <div className="mt-6 grid items-end gap-6 lg:grid-cols-[8fr_4fr] lg:gap-16">
          <HeroTitle lines={splitTitle(title, 20)} className="display-xl text-navy-deep" />
          {(intro || children) && (
            <Rise delay={0.3} className="max-w-md text-base text-muted-foreground sm:text-lg">
              {intro && <p>{intro}</p>}
              {children}
            </Rise>
          )}
        </div>
      </div>
    </header>
  );
}

/** A tall photo tile with the title set over a navy wash, like a team page tile. */
export function PhotoTile({
  to,
  hash,
  title,
  note,
  image,
  focus,
  aspect = "aspect-[4/5]",
}: {
  to: string;
  hash?: string;
  title: string;
  note?: string;
  image: string;
  /** CSS object-position, to keep the important part of a photograph in frame. */
  focus?: string;
  aspect?: string;
}) {
  return (
    <Link
      to={to}
      hash={hash}
      className={cn("group relative isolate block overflow-hidden rounded-lg bg-navy-deep", aspect)}
    >
      <img
        src={image}
        alt=""
        width={800}
        height={1000}
        loading="lazy"
        decoding="async"
        style={{ objectPosition: focus }}
        className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-deep via-navy-deep/30 to-transparent"
      />
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-white sm:p-6">
        <span>
          <span className="block font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            {title}
          </span>
          {note && <span className="mt-1 line-clamp-2 block text-sm text-white/80">{note}</span>}
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gold text-navy-deep transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1">
          <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}

/** Sub-navigation strip: light grey, tabs with an ink underline for the active one. */
export function SubNav({ items }: { items: { href: string; label: string }[] }) {
  return (
    <div className="border-b bg-subnav">
      <nav aria-label="On this page" className="container-wide flex gap-1 overflow-x-auto">
        {items.map((it) => (
          <a
            key={it.href}
            href={it.href}
            className="flex min-h-12 shrink-0 items-center border-b-[3px] border-transparent px-4 font-display text-sm font-semibold text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            {it.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

/** Heading row: bold title left, small outlined action right. */
export function SectionHead({
  title,
  action,
  className,
}: {
  title: string;
  action?: { to: string; label: string };
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4 border-b pb-5", className)}>
      <h2 className="section-title">{title}</h2>
      {action && (
        <Link
          to={action.to}
          className="press inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-foreground/25 px-3.5 font-display text-sm font-semibold hover:bg-foreground hover:text-background"
        >
          {action.label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

/** Quiet empty state: icon tile, one sentence, optional action. */
export function EmptyState({
  title,
  body,
  Icon = Inbox,
  action,
}: {
  title: string;
  body?: string;
  Icon?: LucideIcon;
  action?: { to: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed bg-surface px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-md border bg-secondary text-navy">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-4 font-display text-lg font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && (
        <Link
          to={action.to}
          className="mt-5 inline-flex min-h-11 items-center gap-1.5 font-display text-sm font-semibold text-navy hover:underline"
        >
          {action.label}
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

/** Image-led split row (Club-page pattern). Alternates sides with `flip`. */
export function SplitCard({
  id,
  title,
  body,
  image,
  imageAlt = "",
  flip,
  links,
  children,
}: {
  id?: string;
  title: string;
  body?: string;
  image?: string;
  imageAlt?: string;
  flip?: boolean;
  links?: { to: string; label: string }[];
  children?: React.ReactNode;
}) {
  return (
    <article
      id={id}
      className="scroll-mt-28 grid overflow-clip rounded-lg border bg-surface md:grid-cols-2"
    >
      <div
        className={cn(
          "flex flex-col justify-between gap-8 p-6 sm:p-8 lg:p-10",
          flip && "md:order-2",
        )}
      >
        <div>
          <h3 className="section-title">{title}</h3>
          {body && (
            <p className="body-copy mt-4 whitespace-pre-line text-muted-foreground">{body}</p>
          )}
          {children}
        </div>
        {links && links.length > 0 && (
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.to + l.label}>
                <Link
                  to={l.to}
                  className="group inline-flex min-h-10 items-center gap-1.5 font-display text-sm font-semibold text-navy"
                >
                  <span className="group-hover:underline">{l.label}</span>
                  <ArrowUpRight
                    className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {image ? (
        <div className={cn("min-h-[220px] bg-muted md:min-h-[320px]", flip && "md:order-1")}>
          <img
            src={image}
            alt={imageAlt}
            width={900}
            height={640}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className={cn("hidden bg-navy md:block", flip && "md:order-1")} aria-hidden="true" />
      )}
    </article>
  );
}

export function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
