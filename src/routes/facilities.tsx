import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "@/components/icons";
import { useSiteContent } from "@/lib/use-site-content";
import { EmptyState, PageBanner } from "@/components/page-parts";
import { facilityIcon } from "@/components/icons";
import { StaggerItem, StaggerList } from "@/components/motion";
import libraryImg from "@/assets/library.jpg";
import playgroundImg from "@/assets/playground.jpg";
// science.jpg is the photograph of pupils on laptops, so it belongs to ICT.
import ictImg from "@/assets/science.jpg";
import classroomImg from "@/assets/classroom.jpg";

export const Route = createFileRoute("/facilities")({
  head: () => ({
    meta: [
      { title: "Facilities - Bomas Academy" },
      {
        name: "description",
        content: "A safe, well-equipped campus designed to support learning, creativity and play.",
      },
      { property: "og:title", content: "Facilities - Bomas Academy" },
      {
        property: "og:description",
        content: "A safe, well-equipped campus designed to support learning, creativity and play.",
      },
    ],
  }),
  component: FacilitiesPage,
});

// Photographs the school already has, matched to a facility by name.
const PHOTOS: [string, string][] = [
  ["library", libraryImg],
  ["playground", playgroundImg],
  ["ict", ictImg],
  ["computer", ictImg],
  ["sport", playgroundImg],
];

function photoFor(title: string) {
  const t = title.toLowerCase();
  return PHOTOS.find(([k]) => t.includes(k))?.[1];
}

function FacilitiesPage() {
  const c = useSiteContent();
  const items = (c["facilities.items"] || "")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [title, body] = line.split("|").map((s) => s.trim());
      return { title, body, photo: photoFor(title) };
    });
  const withPhoto = items.filter((i) => i.photo);
  const without = items.filter((i) => !i.photo);

  return (
    <>
      <PageBanner title={c["facilities.title"]} intro={c["facilities.intro"]} image={libraryImg} />
      <section className="container-wide py-10 lg:py-16">
        {items.length > 0 ? (
          <>
            {/* Facilities with a photograph: image on top, caption underneath, offset columns */}
            <StaggerList as="div" className="grid gap-x-6 gap-y-12 md:grid-cols-2">
              {withPhoto.map((f, i) => (
                <StaggerItem key={f.title} as="div" className={i % 2 === 1 ? "md:mt-16" : ""}>
                  <article>
                    <div className="aspect-[4/3] overflow-hidden rounded-lg bg-navy">
                      <img
                        src={f.photo}
                        alt={f.title}
                        width={900}
                        height={675}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
                      />
                    </div>
                    <div className="mt-5 flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-navy-deep text-gold">
                        {(() => {
                          const Icon = facilityIcon(f.title);
                          return <Icon className="h-6 w-6" />;
                        })()}
                      </span>
                      <h2 className="font-display text-3xl font-bold tracking-tight">{f.title}</h2>
                    </div>
                    <p className="mt-2 max-w-md leading-relaxed text-muted-foreground">{f.body}</p>
                  </article>
                </StaggerItem>
              ))}
            </StaggerList>

            {/* The rest as a ruled list */}
            {without.length > 0 && (
              <StaggerList className="mt-16 border-t">
                {without.map((f) => (
                  <StaggerItem
                    key={f.title}
                    className="grid gap-1 border-b py-5 sm:grid-cols-[16rem_1fr] sm:gap-8"
                  >
                    <h2 className="flex items-center gap-3 font-display text-xl font-bold tracking-tight">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-secondary text-navy">
                        {(() => {
                          const Icon = facilityIcon(f.title);
                          return <Icon className="h-5 w-5" />;
                        })()}
                      </span>
                      {f.title}
                    </h2>
                    <p className="text-muted-foreground">{f.body}</p>
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
          </>
        ) : (
          <EmptyState
            Icon={Building2}
            title="Facilities will be listed here"
            body="Check back soon for a tour of the campus."
          />
        )}
      </section>
    </>
  );
}
