import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Facebook, Instagram, Youtube, XLogoIcon as XIcon } from "@/components/icons";
import { useSiteContent } from "@/lib/use-site-content";
import logoAsset from "@/assets/bomas-logo.jpg";

const COLUMNS = [
  {
    title: "The school",
    links: [
      { to: "/about", label: "About" },
      { to: "/staff", label: "Staff" },
      { to: "/news", label: "News" },
      { to: "/gallery", label: "Gallery" },
    ],
  },
  {
    title: "Learning",
    links: [
      { to: "/academics", label: "Academics" },
      { to: "/school-life", label: "School life" },
      { to: "/facilities", label: "Facilities" },
    ],
  },
  {
    title: "Families",
    links: [
      { to: "/admissions", label: "Admissions" },
      { to: "/downloads", label: "Downloads" },
      { to: "/contact", label: "Contact" },
    ],
  },
] as const;

export function SiteFooter() {
  const c = useSiteContent();
  const socials = [
    { Icon: Facebook, href: c["contact.facebook"], label: "Facebook" },
    { Icon: Instagram, href: c["contact.instagram"], label: "Instagram" },
    { Icon: XIcon, href: c["contact.x"], label: "X" },
    { Icon: Youtube, href: c["contact.youtube"], label: "YouTube" },
  ].filter((s) => s.href);

  return (
    <footer className="bg-navy-deep text-white">
      <div className="container-wide grid gap-12 py-14 lg:grid-cols-[1.3fr_2fr_1.2fr] lg:py-16">
        <div>
          <Link to="/" className="flex w-fit items-center gap-3" aria-label="Bomas Academy home">
            <img
              src={logoAsset}
              alt=""
              width={56}
              height={56}
              loading="lazy"
              className="logo-spin h-14 w-14 rounded-full ring-1 ring-white/25"
            />
            <span className="font-display text-2xl font-bold tracking-tight">Bomas Academy</span>
          </Link>
          <p className="mt-3 text-sm text-gold">…inspiring learning for greatness</p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            A nurturing learning community shaping confident, curious and compassionate young minds
            in the heart of Jos, Plateau State.
          </p>
          {socials.length > 0 && (
            <div className="mt-6 flex items-center gap-2">
              {socials.map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="press flex h-11 w-11 items-center justify-center rounded-md border border-white/20 text-white/80 hover:border-gold hover:text-gold"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-white/55">
                {col.title}
              </h2>
              <ul className="mt-4 space-y-1">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="flex min-h-10 items-center font-display text-[15px] font-semibold text-white/90 hover:text-gold"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div>
          <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-white/55">
            Visit and contact
          </h2>
          <address className="mt-4 space-y-2 text-sm not-italic text-white/80">
            <p>{c["contact.address"]}</p>
            <p>
              <a
                href={`tel:${c["contact.phone"].replace(/\s/g, "")}`}
                className="inline-flex min-h-11 items-center hover:text-gold"
              >
                {c["contact.phone"]}
              </a>
            </p>
            <p className="break-words">
              <a
                href={`mailto:${c["contact.email"]}`}
                className="inline-flex min-h-11 items-center hover:text-gold"
              >
                {c["contact.email"]}
              </a>
            </p>
            <p className="text-white/55">{c["contact.hours"]}</p>
          </address>
          <Link
            to="/contact"
            className="press mt-5 inline-flex h-11 items-center gap-2 rounded-md border border-white/30 px-4 font-display text-sm font-semibold hover:bg-white/10"
          >
            Get in touch
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-wide flex flex-col items-start justify-between gap-2 py-5 text-xs text-white/55 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Bomas Academy. All rights reserved.</span>
          <span className="flex items-center gap-5">
            <Link to="/auth" className="flex min-h-11 items-center hover:text-gold">
              Admin sign in
            </Link>
            <span>Developed by Runa Labs</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
