import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { formatDate } from "@/components/page-parts";
import logoAsset from "@/assets/bomas-logo.jpg";

export type NewsCardPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string;
};

/** Image-led news card: 3:2 photo on top, bold title and a mono date underneath. */
export function NewsCard({
  post,
  lead = false,
  compact = false,
  priority = false,
}: {
  post: NewsCardPost;
  lead?: boolean;
  /** Photo beside the text instead of above it, for short side columns. */
  compact?: boolean;
  priority?: boolean;
}) {
  return (
    <Link
      to="/news/$slug"
      params={{ slug: post.slug }}
      className={cn(
        "group flex h-full overflow-clip rounded-lg border bg-surface transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_oklch(0.22_0.09_264/0.45)]",
        compact ? "flex-row" : "flex-col",
      )}
    >
      <div
        className={cn(
          "overflow-hidden bg-muted",
          // A lead card sits beside a taller column: its photo takes up the spare height,
          // so the text never floats in a blank gap.
          lead && "relative aspect-[3/2] lg:grow",
          compact && "relative w-[40%] shrink-0",
          !lead && !compact && "aspect-[3/2]",
        )}
      >
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt=""
            width={800}
            height={533}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className={cn(
              "h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]",
              (lead || compact) && "absolute inset-0",
            )}
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center bg-navy",
              (lead || compact) && "absolute inset-0",
            )}
          >
            <img
              src={logoAsset}
              alt=""
              width={72}
              height={72}
              className="h-16 w-16 rounded-full opacity-90 ring-1 ring-white/25"
            />
          </div>
        )}
      </div>
      <div className={cn("flex flex-col p-4 sm:p-5", !lead && "min-w-0 flex-1")}>
        <h3
          className={cn(
            "font-display font-semibold leading-snug tracking-tight text-foreground group-hover:text-navy",
            lead ? "text-2xl sm:text-[1.75rem]" : compact ? "text-lg" : "text-xl",
          )}
        >
          {post.title}
        </h3>
        {post.excerpt && (
          <p
            className={cn(
              "mt-2 text-[15px] text-muted-foreground",
              compact ? "line-clamp-4 max-lg:hidden" : "line-clamp-2",
            )}
          >
            {post.excerpt}
          </p>
        )}
        <p className="label-mono mt-auto pt-4 text-muted-foreground">
          {formatDate(post.published_at)}
        </p>
      </div>
    </Link>
  );
}

export function NewsCardSkeleton() {
  return (
    <div className="overflow-clip rounded-lg border bg-surface" aria-hidden="true">
      <div className="shimmer aspect-[3/2]" />
      <div className="space-y-3 p-5">
        <div className="shimmer h-5 w-5/6 rounded-md" />
        <div className="shimmer h-5 w-2/3 rounded-md" />
        <div className="shimmer h-3 w-1/3 rounded-md" />
      </div>
    </div>
  );
}
