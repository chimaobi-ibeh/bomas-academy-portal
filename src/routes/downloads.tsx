import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownToLine, FileText } from "@/components/icons";
import { useSiteContent } from "@/lib/use-site-content";
import { EmptyState, PaperHeader } from "@/components/page-parts";
import { StaggerItem, StaggerList } from "@/components/motion";

export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      { title: "Downloads - Bomas Academy" },
      {
        name: "description",
        content: "Forms, prospectuses and policy documents for Bomas Academy families.",
      },
      { property: "og:title", content: "Downloads - Bomas Academy" },
      {
        property: "og:description",
        content: "Forms, prospectuses and policy documents for Bomas Academy families.",
      },
    ],
  }),
  component: DownloadsPage,
});

function DownloadsPage() {
  const c = useSiteContent();
  const items = (c["downloads.items"] || "")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [title, url] = line.split("|").map((s) => s.trim());
      return { title, url };
    });

  return (
    <>
      <PaperHeader trail="Downloads" title={c["downloads.title"]} intro={c["downloads.intro"]} />
      <section className="container-wide py-10 lg:py-14">
        <div className="mx-auto max-w-3xl">
          {items.length > 0 ? (
            <StaggerList className="overflow-clip rounded-lg border bg-surface">
              {items.map((item) => (
                <StaggerItem key={item.title} className="border-b last:border-b-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex min-h-16 items-center gap-4 px-4 py-3 hover:bg-muted sm:px-5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-secondary text-navy">
                      <FileText className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 font-display text-base font-semibold sm:text-lg">
                      {item.title}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 font-display text-sm font-semibold text-navy">
                      <span className="hidden sm:inline">Download</span>
                      <ArrowDownToLine
                        className="h-4 w-4 transition-transform group-hover:translate-y-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </a>
                </StaggerItem>
              ))}
            </StaggerList>
          ) : (
            <EmptyState
              Icon={FileText}
              title="No documents yet"
              body="Forms and policy documents will appear here when the school adds them."
              action={{ to: "/contact", label: "Ask the school office" }}
            />
          )}
        </div>
      </section>
    </>
  );
}
