import { Link, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronDown, Mail, Phone } from "@/components/icons";
import logoAsset from "@/assets/bomas-logo.jpg";
import missionImg from "@/assets/about-mission.jpg";
import academicImg from "@/assets/academic-primary.webp";
import admissionsImg from "@/assets/admissions-featured.jpg";
import playgroundImg from "@/assets/playground.jpg";
import { useSiteContent } from "@/lib/use-site-content";
import { EASE } from "@/components/motion";

type Item = { to: string; hash?: string; label: string; note: string };
type Group = {
  key: string;
  label: string;
  to: string;
  items: Item[];
  feature: { img: string; title: string; to: string; cta: string };
};

export const NAV_GROUPS: Group[] = [
  {
    key: "about",
    label: "About",
    to: "/about",
    items: [
      { to: "/about", hash: "story", label: "Our story", note: "Who we are" },
      {
        to: "/about",
        hash: "purpose",
        label: "Mission and vision",
        note: "What we are here to do",
      },
      { to: "/about", hash: "values", label: "The BOMAS values", note: "Five commitments" },
      { to: "/staff", label: "Our staff", note: "The people in the classroom" },
    ],
    feature: {
      img: missionImg,
      title: "Meet the Bomas community",
      to: "/about",
      cta: "About Bomas",
    },
  },
  {
    key: "academics",
    label: "Academics",
    to: "/academics",
    items: [
      { to: "/academics", hash: "early", label: "Early Years", note: "Where learning begins" },
      {
        to: "/academics",
        hash: "primary",
        label: "Primary School",
        note: "Building strong foundations",
      },
      {
        to: "/academics",
        hash: "secondary",
        label: "Secondary School",
        note: "Preparing for what is next",
      },
    ],
    feature: {
      img: academicImg,
      title: "A programme for every stage",
      to: "/academics",
      cta: "See academics",
    },
  },
  {
    key: "admissions",
    label: "Admissions",
    to: "/admissions",
    items: [
      { to: "/admissions", label: "How to apply", note: "Steps for new families" },
      { to: "/downloads", label: "Forms and downloads", note: "Prospectus and policies" },
      { to: "/contact", label: "Visit or call us", note: "Talk to the school office" },
    ],
    feature: {
      img: admissionsImg,
      title: "Bring your child to Bomas",
      to: "/admissions",
      cta: "Start admissions",
    },
  },
  {
    key: "life",
    label: "School life",
    to: "/school-life",
    items: [
      { to: "/school-life", label: "Campus experience", note: "The day, the uniform, the space" },
      { to: "/facilities", label: "Facilities", note: "Library, labs and play" },
      { to: "/gallery", label: "Gallery", note: "Life at Bomas in pictures" },
    ],
    feature: {
      img: playgroundImg,
      title: "A day at Bomas",
      to: "/school-life",
      cta: "School life",
    },
  },
];

const PLAIN = [
  { to: "/news", label: "News" },
  { to: "/contact", label: "Contact" },
] as const;

const UTILITY = [
  { to: "/downloads", label: "Downloads" },
  { to: "/facilities", label: "Facilities" },
  { to: "/staff", label: "Staff" },
] as const;

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Includes the #section, so a link to another part of the same page counts as a move too.
  const locationKey = useRouterState({ select: (s) => s.location.href });
  const c = useSiteContent();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  const openMenu = useCallback((key: string) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpen(key);
  }, []);
  const scheduleClose = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(null), 140);
  }, []);

  useEffect(() => {
    setOpen(null);
    setMobile(false);
    setExpanded(null);
  }, [locationKey]);

  // Every link in the mobile menu closes it on tap, even when it leads to the page you are
  // already on (the address does not change then, so nothing else would close it).
  const closeMobile = useCallback(() => {
    setMobile(false);
    setExpanded(null);
  }, []);

  // The bar compacts a little once the page is scrolled.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape closes either menu; mobile menu locks scroll and traps focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        if (mobile) {
          setMobile(false);
          burgerRef.current?.focus();
        }
      }
      if (e.key === "Tab" && mobile && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled])");
        const all = [burgerRef.current, ...Array.from(f)].filter(Boolean) as HTMLElement[];
        const first = all[0];
        const last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobile]);

  useEffect(() => {
    if (!mobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobile]);

  const group = NAV_GROUPS.find((g) => g.key === open) ?? null;

  return (
    <>
      <div className="hidden bg-navy-deep text-white/80 lg:block">
        <div className="container-wide flex h-9 items-center justify-between text-[13px]">
          <div className="flex items-center gap-1">
            <span className="mr-3 rounded-md border border-white/35 px-2.5 py-0.5 font-display text-xs font-semibold text-white">
              bomasacademy.org
            </span>
            {UTILITY.map((u) => (
              <Link
                key={u.to}
                to={u.to}
                className="flex h-9 items-center rounded-md px-2.5 hover:text-white"
              >
                {u.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-5">
            {c["contact.phone"] && (
              <a
                href={`tel:${c["contact.phone"].replace(/\s/g, "")}`}
                className="flex h-9 items-center gap-1.5 hover:text-white"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {c["contact.phone"]}
              </a>
            )}
            {c["contact.email"] && (
              <a
                href={`mailto:${c["contact.email"]}`}
                className="flex h-9 items-center gap-1.5 hover:text-white"
              >
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {c["contact.email"]}
              </a>
            )}
          </div>
        </div>
      </div>

      <header
        className={`sticky top-0 z-40 bg-navy text-white transition-shadow duration-300 ${scrolled ? "shadow-[0_10px_30px_-18px_oklch(0.15_0.09_264/0.7)]" : ""}`}
        onMouseLeave={scheduleClose}
        onMouseEnter={() => closeTimer.current && window.clearTimeout(closeTimer.current)}
      >
        <div
          className={`container-wide flex items-center justify-between gap-6 transition-[height] duration-300 ease-out ${scrolled ? "h-14 lg:h-[60px]" : "h-16 lg:h-[72px]"}`}
        >
          <Link to="/" className="flex min-h-11 items-center gap-3" aria-label="Bomas Academy home">
            <img
              src={logoAsset}
              alt=""
              width={44}
              height={44}
              className={`logo-spin rounded-full ring-1 ring-white/25 ${scrolled ? "h-9 w-9" : "h-10 w-10 lg:h-11 lg:w-11"}`}
            />
            <span className="leading-tight">
              <span className="block font-display text-[17px] font-bold tracking-tight lg:text-lg">
                Bomas Academy
              </span>
              <span className="block text-[11px] text-gold">…inspiring learning for greatness</span>
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-stretch self-stretch lg:flex">
            {NAV_GROUPS.map((g) => {
              const active =
                isActive(g.to) ||
                g.items.some((i) => isActive(i.to) && i.to !== "/about" && i.to !== "/academics");
              return (
                <div key={g.key} className="relative flex" onMouseEnter={() => openMenu(g.key)}>
                  <button
                    type="button"
                    aria-expanded={open === g.key}
                    aria-controls={`menu-${g.key}`}
                    onClick={() => (open === g.key ? setOpen(null) : openMenu(g.key))}
                    className="group relative flex h-full items-center gap-1 px-3.5 font-display text-[15px] font-semibold text-white/90 hover:text-white xl:px-4"
                  >
                    {g.label}
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 transition-transform duration-300 ${open === g.key ? "rotate-180" : ""}`}
                    />
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-3.5 bottom-0 h-[3px] origin-left bg-gold transition-transform duration-300 xl:inset-x-4 ${
                        active || open === g.key
                          ? "scale-x-100"
                          : "scale-x-0 group-hover:scale-x-100"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
            {PLAIN.map((p) => (
              <Link
                key={p.to}
                to={p.to}
                onMouseEnter={() => setOpen(null)}
                className="group relative flex h-full items-center px-3.5 font-display text-[15px] font-semibold text-white/90 hover:text-white xl:px-4"
              >
                {p.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-3.5 bottom-0 h-[3px] origin-left bg-gold transition-transform duration-300 xl:inset-x-4 ${
                    isActive(p.to) ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/admissions"
              className="press hidden h-10 items-center gap-2 rounded-md bg-gold px-4 font-display text-sm font-semibold text-navy-deep hover:-translate-y-px hover:brightness-95 sm:inline-flex"
            >
              Apply now
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <button
              ref={burgerRef}
              type="button"
              onClick={() => setMobile((v) => !v)}
              className="press flex h-11 w-11 items-center justify-center rounded-md border border-white/30 lg:hidden"
              aria-expanded={mobile}
              aria-controls="mobile-menu"
              aria-label={mobile ? "Close menu" : "Open menu"}
            >
              <span className="relative block h-3.5 w-5" aria-hidden="true">
                <motion.span
                  className="absolute left-0 top-0 block h-0.5 w-full rounded-full bg-current"
                  initial={false}
                  animate={mobile ? { y: 6, rotate: 45 } : { y: 0, rotate: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                />
                <motion.span
                  className="absolute left-0 top-[6px] block h-0.5 w-full rounded-full bg-current"
                  initial={false}
                  animate={mobile ? { opacity: 0, scaleX: 0.2 } : { opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.2, ease: EASE }}
                />
                <motion.span
                  className="absolute left-0 top-3 block h-0.5 w-full rounded-full bg-current"
                  initial={false}
                  animate={mobile ? { y: -6, rotate: -45 } : { y: 0, rotate: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                />
              </span>
            </button>
          </div>
        </div>

        {/* Mega-menu */}
        <AnimatePresence>
          {group && (
            <motion.div
              key="mega"
              id={`menu-${group.key}`}
              className="absolute inset-x-0 top-full hidden border-t border-white/10 bg-surface text-foreground shadow-[0_30px_60px_-30px_oklch(0.22_0.09_264/0.5)] lg:block"
              initial={reduce ? false : { opacity: 0, clipPath: "inset(0 0 100% 0)" }}
              animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.3, ease: EASE }}
              onMouseEnter={() => closeTimer.current && window.clearTimeout(closeTimer.current)}
            >
              <div className="container-wide grid grid-cols-[1fr_1fr_minmax(0,17rem)] gap-8 py-5">
                <div className="col-span-2 grid grid-cols-2 content-start gap-x-6 gap-y-0.5">
                  <Link
                    to={group.to}
                    className="col-span-2 mb-2 flex items-center gap-2 border-b pb-2.5 font-display text-lg font-bold tracking-tight text-navy hover:text-navy-deep"
                  >
                    {group.label}
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </Link>
                  {group.items.map((it, n) => (
                    <motion.div
                      key={it.label}
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: EASE, delay: 0.06 + n * 0.04 }}
                    >
                      <Link
                        to={it.to}
                        hash={it.hash}
                        className="group/link block rounded-md px-3 py-2 hover:bg-muted"
                      >
                        <span className="flex items-center gap-2 font-display text-[15px] font-semibold text-foreground">
                          {it.label}
                          <ArrowRight
                            className="h-4 w-4 -translate-x-1 text-gold opacity-0 transition-all duration-300 group-hover/link:translate-x-0 group-hover/link:opacity-100"
                            aria-hidden="true"
                          />
                        </span>
                        <span className="block text-[13px] text-muted-foreground">{it.note}</span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
                <Link
                  to={group.feature.to}
                  className="group/feat block overflow-hidden rounded-lg border"
                >
                  <div className="aspect-[2/1] overflow-hidden bg-muted">
                    <img
                      src={group.feature.img}
                      alt=""
                      width={640}
                      height={360}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover/feat:scale-[1.03]"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                    <span className="font-display text-sm font-semibold leading-snug">
                      {group.feature.title}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 font-display text-[13px] font-semibold text-navy">
                      <span className="sr-only">{group.feature.cta}</span>
                      <ArrowRight
                        className="h-4 w-4 transition-transform group-hover/feat:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobile && (
          <motion.div
            key="mobile"
            id="mobile-menu"
            ref={panelRef}
            className={`fixed inset-x-0 bottom-0 z-30 flex flex-col overflow-y-auto bg-navy-deep text-white lg:hidden ${scrolled ? "top-14" : "top-16"}`}
            initial={reduce ? false : { clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <nav aria-label="Mobile" className="container-wide flex-1 pb-6 pt-2">
              <ul>
                {NAV_GROUPS.map((g, i) => {
                  const isOpen = expanded === g.key;
                  return (
                    <motion.li
                      key={g.key}
                      className="border-b border-white/10"
                      initial={reduce ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: EASE, delay: 0.06 + i * 0.04 }}
                    >
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setExpanded(isOpen ? null : g.key)}
                        className="flex min-h-14 w-full items-center justify-between font-display text-xl font-semibold"
                      >
                        {g.label}
                        <ChevronDown
                          aria-hidden="true"
                          className={`h-5 w-5 text-gold transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: EASE }}
                            className="overflow-hidden"
                          >
                            {g.items.map((it) => (
                              <li key={it.label}>
                                <Link
                                  to={it.to}
                                  hash={it.hash}
                                  onClick={closeMobile}
                                  className="flex min-h-12 items-center justify-between py-2 pl-3 text-[15px] text-white/85"
                                >
                                  {it.label}
                                  <ArrowRight
                                    className="h-4 w-4 text-white/40"
                                    aria-hidden="true"
                                  />
                                </Link>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </motion.li>
                  );
                })}
                {PLAIN.map((p, i) => (
                  <motion.li
                    key={p.to}
                    className="border-b border-white/10"
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.4,
                      ease: EASE,
                      delay: 0.06 + (NAV_GROUPS.length + i) * 0.04,
                    }}
                  >
                    <Link
                      to={p.to}
                      onClick={closeMobile}
                      className="flex min-h-14 items-center font-display text-xl font-semibold"
                    >
                      {p.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </nav>
            <div className="container-wide sticky bottom-0 border-t border-white/10 bg-navy-deep py-4">
              <Link
                to="/admissions"
                onClick={closeMobile}
                className="press flex h-12 w-full items-center justify-center gap-2 rounded-md bg-gold font-display text-[15px] font-semibold text-navy-deep"
              >
                Apply now
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
