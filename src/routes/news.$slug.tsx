import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "@/components/icons";
import { formatDate } from "@/components/page-parts";
import { NewsCard } from "@/components/news-card";
import { ReadingProgress, Rise } from "@/components/motion";

export const Route = createFileRoute("/news/$slug")({
  head: () => ({
    meta: [{ title: "Story - Bomas Academy" }],
  }),
  component: NewsDetail,
  notFoundComponent: () => (
    <div className="container-wide py-28 text-center">
      <h1 className="page-title">Story not found</h1>
      <p className="mt-3 text-muted-foreground">It may have been unpublished or moved.</p>
      <Link
        to="/news"
        className="press mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 font-display text-sm font-semibold text-primary-foreground hover:bg-navy-deep"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to news
      </Link>
    </div>
  ),
});

function NewsDetail() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["news_post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: more } = useQuery({
    queryKey: ["news_more", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("news_posts")
        .select("id, slug, title, excerpt, cover_image_url, published_at")
        .eq("published", true)
        .neq("slug", slug)
        .order("published_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

  // The tab and share title follow the story once it has loaded.
  const storyTitle = data?.title?.trim();
  useEffect(() => {
    if (!storyTitle) return;
    const previous = document.title;
    document.title = `${storyTitle} - Bomas Academy`;
    return () => {
      document.title = previous;
    };
  }, [storyTitle]);

  if (isLoading) {
    return (
      <div className="container-read py-16" aria-busy="true">
        <div className="shimmer h-4 w-24 rounded-md" />
        <div className="shimmer mt-6 h-12 w-full rounded-md" />
        <div className="shimmer mt-3 h-12 w-2/3 rounded-md" />
        <div className="shimmer mt-10 aspect-[16/9] w-full rounded-lg" />
      </div>
    );
  }
  if (!data) throw notFound();

  return (
    <>
      <ReadingProgress />
      <article className="container-read pb-16 pt-10 lg:pt-14">
        <Link
          to="/news"
          className="inline-flex min-h-11 items-center gap-2 font-display text-sm font-semibold text-navy hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All stories
        </Link>
        <Rise>
          <p className="label-mono mt-6 text-muted-foreground">{formatDate(data.published_at)}</p>
          <h1 className="page-title mt-3">{data.title}</h1>
        </Rise>
        {data.cover_image_url && (
          <img
            src={data.cover_image_url}
            alt=""
            width={1200}
            height={675}
            className="mt-8 aspect-[16/9] w-full rounded-lg object-cover"
          />
        )}
        {data.excerpt && (
          <p className="mt-8 font-display text-xl font-medium leading-relaxed text-foreground/80 sm:text-2xl">
            {data.excerpt}
          </p>
        )}
        <NewsBody body={data.body} />
      </article>

      {more && more.length > 0 && (
        <section className="border-t bg-surface">
          <div className="container-wide py-14">
            <h2 className="section-title">More stories</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((p) => (
                <NewsCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function NewsBody({ body }: { body: string }) {
  // Lightweight renderer: supports paragraphs and markdown images: ![alt](url)
  const blocks = body.split(/\n{2,}/);
  const imgRe = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/;
  const imgClass = "w-full rounded-lg aspect-[4/3] object-cover bg-secondary";
  return (
    <div className="mt-8 space-y-6 text-lg leading-[1.75] text-foreground/90">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        const m = trimmed.match(imgRe);
        if (m) {
          return <img key={i} src={m[2]} alt={m[1]} loading="lazy" className={imgClass} />;
        }
        // mixed lines: split by single newline, render images inline as standalone blocks
        const lines = trimmed.split(/\n/);
        if (lines.some((l) => imgRe.test(l.trim()))) {
          return (
            <div key={i} className="space-y-6">
              {lines.map((l, j) => {
                const im = l.trim().match(imgRe);
                if (im) {
                  return (
                    <img key={j} src={im[2]} alt={im[1]} loading="lazy" className={imgClass} />
                  );
                }
                return l.trim() ? <p key={j}>{l}</p> : null;
              })}
            </div>
          );
        }
        return <p key={i}>{trimmed}</p>;
      })}
    </div>
  );
}
