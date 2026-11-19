import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/seo";

const PAGES: { path: string; changefreq: string; priority: string }[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/admissions", changefreq: "monthly", priority: "0.9" },
  { path: "/admissions/apply", changefreq: "monthly", priority: "0.9" },
  { path: "/academics", changefreq: "monthly", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/school-life", changefreq: "monthly", priority: "0.7" },
  { path: "/facilities", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "yearly", priority: "0.7" },
  { path: "/staff", changefreq: "monthly", priority: "0.6" },
  { path: "/news", changefreq: "weekly", priority: "0.6" },
  { path: "/gallery", changefreq: "monthly", priority: "0.5" },
  { path: "/downloads", changefreq: "monthly", priority: "0.5" },
];

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        let posts: { slug: string; updated_at: string; published_at: string }[] = [];
        try {
          const { data } = await supabase
            .from("news_posts")
            .select("slug, updated_at, published_at")
            .eq("published", true)
            .order("published_at", { ascending: false });
          posts = data ?? [];
        } catch (error) {
          console.error("[sitemap] failed to load news posts", error);
        }

        const entries = [
          ...PAGES.map(
            (p) =>
              `  <url><loc>${SITE_URL}${p.path === "/" ? "/" : p.path}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`,
          ),
          ...posts.map(
            (p) =>
              `  <url><loc>${SITE_URL}/news/${escapeXml(encodeURIComponent(p.slug))}</loc><lastmod>${new Date(p.updated_at || p.published_at).toISOString()}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>`,
          ),
        ];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
