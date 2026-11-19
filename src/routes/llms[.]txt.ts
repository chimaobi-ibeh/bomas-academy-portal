import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { DEFAULTS } from "@/lib/use-site-content";
import { fetchContent, orNothing } from "@/lib/data";
import { SITE_URL } from "@/lib/seo";

// A plain-text summary of the school for AI assistants (llms.txt convention).
// Built from the same CMS content as the website so it never goes out of date.
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        const c = { ...DEFAULTS, ...((await orNothing(fetchContent)) ?? {}) };
        const lines = (key: string) => (c[key] || "").split("\n").map((l) => l.trim()).filter(Boolean);
        const values = ["bravery", "opportunity", "mastery", "authenticity", "service"].map((k) => {
          const [title, body] = (c[`about.values.${k}`] || "").split("\n");
          return `- ${title}: ${body ?? ""}`.trim();
        });
        const facilities = lines("facilities.items").map((l) => {
          const [t, b] = l.split("|").map((s) => s.trim());
          return `- ${t}${b ? `: ${b}` : ""}`;
        });
        const steps = lines("admissions.steps").map((s, i) => `${i + 1}. ${s.replace(/^\d+\.\s*/, "")}`);

        const text = `# Bomas Academy

> Bomas Academy is a private nursery, primary and secondary school at No 10 Metropolitan Crescent, G.R.A, Jos, Plateau State, Nigeria. It educates children from Early Years (age 2) through Primary 1 to 6 and Secondary School (JSS 1 to SSS 3), preparing students for WAEC, NECO and university. Motto: "Inspiring learning for greatness."

## Key facts
- Name: Bomas Academy
- Type: Private nursery, primary and secondary school
- Location: ${c["contact.address"]} (G.R.A, Jos, Plateau State, Nigeria)
- Phone (main office): ${c["contact.phone"]}
- Phone (admissions): ${c["admissions.phone"]}
- Email: ${c["contact.email"]}
- Office hours: ${c["contact.hours"]}
- School day: ${c["schoolLife.campus.day.body"]}
- Website: ${SITE_URL}

## Mission and vision
- Mission: ${c["about.mission"]}
- Vision: ${c["about.vision"]}

## About
${c["about.story"] || c["home.intro.body"]}

## Academic stages
- ${c["academics.early.title"]}: ${c["academics.early.body"]}
- ${c["academics.primary.title"]}: ${c["academics.primary.body"]}
- ${c["academics.secondary.title"]}: ${c["academics.secondary.body"]}

## Core values (the BOMAS way)
${values.join("\n")}

## Facilities
${facilities.join("\n")}

## Admissions process
${steps.join("\n")}
Parents can apply online at ${SITE_URL}/admissions/apply (no account needed): complete the Admission Form and Class Form, upload the child's passport photograph and birth certificate, and pay the application fee. Paying the application fee does not guarantee admission. School fees vary by class; contact the admissions office for the current fee schedule.

## Pages
- [Home](${SITE_URL}/): Overview of the school
- [About](${SITE_URL}/about): Story, mission, vision and BOMAS core values
- [Academics](${SITE_URL}/academics): Early Years, Primary and Secondary programmes
- [Admissions](${SITE_URL}/admissions): How to apply, plus FAQs for parents
- [Apply online](${SITE_URL}/admissions/apply): Online admission application and fee payment
- [School Life](${SITE_URL}/school-life): School day, uniform, homework, health, safety and the home-school agreement
- [Facilities](${SITE_URL}/facilities): Library, ICT lab, science laboratory, sports field and more
- [Staff](${SITE_URL}/staff): Teachers and school leaders
- [News](${SITE_URL}/news): Announcements and events
- [Gallery](${SITE_URL}/gallery): Photos of school life
- [Downloads](${SITE_URL}/downloads): Forms, prospectus and policies
- [Contact](${SITE_URL}/contact): Address, phone, email and enquiry form
`;
        return new Response(text, {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
