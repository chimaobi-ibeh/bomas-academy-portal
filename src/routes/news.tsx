import { createFileRoute, Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Newspaper } from "@/components/icons";
import { fetchNewsList, orNothing } from "@/lib/data";
import { EmptyState, PaperHeader, formatDate } from "@/components/page-parts";
import { NewsCardSkeleton } from "@/components/news-card";
import { Reveal, StaggerItem, StaggerList } from "@/components/motion";
import logoAsset from "@/assets/bomas-logo.jpg";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "News - Bomas Academy" },
      { name: "description", content: "Announcements, events and stories from Bomas Academy." },
      { property: "og:title", content: "News - Bomas Academy" },
      {
        property: "og:description",
        content: "Announcements, events and stories from Bomas Academy.",
      },
    ],
  }),
  loader: () => orNothing(fetchNewsList),
  component: NewsRoute,
});

// /news/$slug is a child of this route, so when an article is open it must be shown here.
function NewsRoute() {
  const child = useChildMatches();
  return child.length > 0 ? <Outlet /> : <NewsPage />;
}

function NewsPage() {
  const loaded = Route.useLoaderData();
  const {
    data: posts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["news_list"],
    queryFn: fetchNewsList,
    staleTime: 30_000,
    initialData: loaded,
  });

  const [lead, ...rest] = posts ?? [];

  return (
    <>
      <PaperHeader
        trail="News"
        title="What is happening at Bomas."
        intro="Announcements, events and stories from the school."
      />
      <section className="container-wide py-10 lg:py-14">
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <NewsCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-danger-soft p-5 text-sm text-destructive"
          >
            We could not load the news right now. {(error as Error).message}
          </div>
        ) : lead ? (
          <>
            {/* Lead story: photograph and headline side by side */}
            <Reveal>
              <Link
                to="/news/$slug"
                params={{ slug: lead.slug }}
                className="group grid overflow-clip rounded-lg border bg-surface lg:grid-cols-[7fr_5fr]"
              >
                <div className="relative aspect-[3/2] overflow-hidden bg-navy lg:aspect-auto lg:min-h-[420px]">
                  {lead.cover_image_url ? (
                    <img
                      src={lead.cover_image_url}
                      alt=""
                      width={1100}
                      height={733}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img
                        src={logoAsset}
                        alt=""
                        width={96}
                        height={96}
                        className="h-24 w-24 rounded-full ring-1 ring-white/25"
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-end p-6 sm:p-10">
                  <p className="label-mono text-muted-foreground">
                    {formatDate(lead.published_at)}
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-bold leading-[1.08] tracking-[-0.03em] group-hover:text-navy sm:text-4xl">
                    {lead.title}
                  </h2>
                  {lead.excerpt && (
                    <p className="mt-4 line-clamp-4 text-muted-foreground">{lead.excerpt}</p>
                  )}
                  <span className="mt-6 inline-flex items-center gap-1.5 font-display text-sm font-semibold text-navy">
                    Read the story <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </Reveal>

            {/* The rest: a dated list, newest first */}
            {rest.length > 0 && (
              <StaggerList className="mt-10 border-t">
                {rest.map((p) => (
                  <StaggerItem key={p.id} className="border-b">
                    <Link
                      to="/news/$slug"
                      params={{ slug: p.slug }}
                      className="group grid grid-cols-[1fr_5.5rem] items-center gap-4 py-5 sm:grid-cols-[9rem_1fr_9rem] sm:gap-8 sm:py-6"
                    >
                      <p className="label-mono order-2 col-span-2 text-muted-foreground sm:order-none sm:col-span-1">
                        {formatDate(p.published_at)}
                      </p>
                      <div className="order-1 sm:order-none">
                        <h3 className="font-display text-xl font-bold leading-snug tracking-tight group-hover:text-navy sm:text-2xl">
                          {p.title}
                        </h3>
                        {p.excerpt && (
                          <p className="mt-1.5 line-clamp-2 text-[15px] text-muted-foreground">
                            {p.excerpt}
                          </p>
                        )}
                      </div>
                      <div className="order-1 aspect-[3/2] overflow-hidden rounded-md bg-navy sm:order-none">
                        {p.cover_image_url && (
                          <img
                            src={p.cover_image_url}
                            alt=""
                            width={300}
                            height={200}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                          />
                        )}
                      </div>
                    </Link>
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
          </>
        ) : (
          <EmptyState
            Icon={Newspaper}
            title="No stories yet"
            body="News and announcements will appear here once the school publishes them."
          />
        )}
      </section>
    </>
  );
}
