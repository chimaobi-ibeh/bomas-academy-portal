import heroImg from "@/assets/hero-campus.jpg";
import logoImg from "@/assets/bomas-logo.jpg";
import { DEFAULTS, type SiteContent } from "@/lib/use-site-content";

export const SITE_URL = "https://www.bomasacademy.org";
export const SITE_NAME = "Bomas Academy";
export const DEFAULT_OG_IMAGE = heroImg;
export const LOGO_IMAGE = logoImg;

const ORG_ID = `${SITE_URL}/#school`;
const WEBSITE_ID = `${SITE_URL}/#website`;

export function absoluteUrl(pathOrUrl: string) {
  if (!pathOrUrl) return SITE_URL;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/** Converts a Nigerian local number (e.g. "0803 605 8313") to E.164 (+2348036058313). */
export function toE164(phone: string) {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
  return `+${digits}`;
}

type Crumb = { name: string; path: string };

type PageHeadOptions = {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  imageAlt?: string;
  type?: "website" | "article";
  noindex?: boolean;
  breadcrumbs?: Crumb[];
  jsonLd?: Record<string, unknown>[];
  extraMeta?: Record<string, string>[];
};

/**
 * Builds a complete, consistent <head> for a public page: title, description,
 * canonical, Open Graph, Twitter card, and JSON-LD structured data.
 */
export function pageHead(opts: PageHeadOptions) {
  const url = absoluteUrl(opts.path);
  const image = absoluteUrl(opts.image || DEFAULT_OG_IMAGE);
  const imageAlt = opts.imageAlt || "Students at Bomas Academy, Jos, Plateau State";

  const meta: Record<string, string>[] = [
    { title: opts.title },
    { name: "description", content: opts.description },
    { name: "robots", content: opts.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1" },
    { property: "og:title", content: opts.title },
    { property: "og:description", content: opts.description },
    { property: "og:url", content: url },
    { property: "og:type", content: opts.type ?? "website" },
    { property: "og:image", content: image },
    { property: "og:image:alt", content: imageAlt },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: opts.title },
    { name: "twitter:description", content: opts.description },
    { name: "twitter:image", content: image },
    ...(opts.extraMeta ?? []),
  ];

  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: opts.title,
      description: opts.description,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORG_ID },
      primaryImageOfPage: { "@type": "ImageObject", url: image },
      inLanguage: "en-NG",
    },
  ];

  if (opts.breadcrumbs && opts.breadcrumbs.length > 0) {
    const crumbs = [{ name: "Home", path: "/" }, ...opts.breadcrumbs];
    graph.push({
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: absoluteUrl(c.path),
      })),
    });
  }

  if (opts.jsonLd) graph.push(...opts.jsonLd);

  return {
    meta,
    links: opts.noindex ? [] : [{ rel: "canonical", href: url }],
    scripts: opts.noindex ? [] : [jsonLdScript({ "@context": "https://schema.org", "@graph": graph })],
  };
}

export function jsonLdScript(data: unknown) {
  // Escape "<" so content can never break out of the script tag.
  return { type: "application/ld+json", children: JSON.stringify(data).replace(/</g, "\\u003c") };
}

/** Site-wide School + WebSite entities. Rendered once in the root head. */
export function schoolJsonLd(content: SiteContent = DEFAULTS) {
  const c = { ...DEFAULTS, ...content };
  const sameAs = [c["contact.facebook"], c["contact.instagram"], c["contact.x"], c["contact.youtube"]].filter(Boolean);
  const phones = [toE164(c["contact.phone"]), toE164(c["admissions.phone"])].filter(Boolean) as string[];

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["School", "EducationalOrganization"],
        "@id": ORG_ID,
        name: SITE_NAME,
        alternateName: ["Bomas Academy Jos", "Bomas School Jos"],
        slogan: "Inspiring learning for greatness",
        description:
          "Bomas Academy is a private nursery, primary and secondary school in G.R.A, Jos, Plateau State, Nigeria, serving children from early years (age 2) through senior secondary (JSS and SSS, preparing students for WAEC and NECO).",
        url: SITE_URL,
        logo: { "@type": "ImageObject", url: absoluteUrl(LOGO_IMAGE) },
        image: absoluteUrl(DEFAULT_OG_IMAGE),
        email: c["contact.email"],
        telephone: phones[0],
        address: {
          "@type": "PostalAddress",
          streetAddress: "No 10 Metropolitan Crescent, G.R.A",
          addressLocality: "Jos",
          addressRegion: "Plateau State",
          addressCountry: "NG",
        },
        areaServed: [
          { "@type": "City", name: "Jos" },
          { "@type": "State", name: "Plateau State" },
        ],
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "admissions",
            telephone: phones[1] ?? phones[0],
            email: c["contact.email"],
            areaServed: "NG",
            availableLanguage: ["English"],
          },
          {
            "@type": "ContactPoint",
            contactType: "customer service",
            telephone: phones[0],
            email: c["contact.email"],
            areaServed: "NG",
            availableLanguage: ["English"],
          },
        ],
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            opens: "07:30",
            closes: "16:00",
          },
        ],
        knowsAbout: [
          "Early years education",
          "Nursery education",
          "Primary education",
          "Secondary education",
          "WAEC preparation",
          "NECO preparation",
          "ICT education",
          "Science education",
        ],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "School programmes",
          itemListElement: [
            { "@type": "Offer", itemOffered: { "@type": "EducationalOccupationalProgram", name: "Early Years (ages 2 to 5)", url: absoluteUrl("/academics") } },
            { "@type": "Offer", itemOffered: { "@type": "EducationalOccupationalProgram", name: "Primary School (Primary 1 to 6)", url: absoluteUrl("/academics") } },
            { "@type": "Offer", itemOffered: { "@type": "EducationalOccupationalProgram", name: "Secondary School (JSS 1 to SSS 3)", url: absoluteUrl("/academics") } },
          ],
        },
        sameAs,
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { "@id": ORG_ID },
        inLanguage: "en-NG",
      },
    ],
  };
}
