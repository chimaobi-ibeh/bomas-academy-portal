import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ImageIcon, X } from "@/components/icons";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { fetchGallery, orNothing } from "@/lib/data";
import { EmptyState, PaperHeader } from "@/components/page-parts";
import { EASE, StaggerItem, StaggerList } from "@/components/motion";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery - Bomas Academy" },
      {
        name: "description",
        content:
          "Moments from life at Bomas Academy, including classrooms, events, sports and more.",
      },
      { property: "og:title", content: "Gallery - Bomas Academy" },
      {
        property: "og:description",
        content:
          "Moments from life at Bomas Academy, including classrooms, events, sports and more.",
      },
    ],
  }),
  loader: () => orNothing(fetchGallery),
  component: GalleryPage,
});

function GalleryPage() {
  const [active, setActive] = useState<number | null>(null);
  const loaded = Route.useLoaderData();
  const { data: images, isLoading } = useQuery({
    queryKey: ["gallery"],
    queryFn: fetchGallery,
    staleTime: 30_000,
    initialData: loaded,
  });

  const list = images ?? [];
  const [dir, setDir] = useState(1);
  const step = (d: number) => {
    setDir(d);
    setActive((i) => (i === null ? i : (i + d + list.length) % list.length));
  };
  const current = active !== null ? list[active] : null;

  return (
    <>
      <PaperHeader
        trail="Gallery"
        title="Life at Bomas, in pictures."
        intro="Classrooms, events, sports and the everyday moments in between. Select a photo to see it larger."
      />
      <section className="container-wide py-10 lg:py-14">
        {isLoading ? (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4" aria-busy="true">
            {[4 / 3, 1, 3 / 4, 1, 4 / 3, 3 / 4].map((r, i) => (
              <div
                key={i}
                className="shimmer break-inside-avoid rounded-lg"
                style={{ aspectRatio: String(r) }}
              />
            ))}
          </div>
        ) : list.length > 0 ? (
          <StaggerList as="div" className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
            {list.map((img, i) => (
              <StaggerItem key={img.id} as="div" className="break-inside-avoid">
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={img.title ? `Open photo: ${img.title}` : `Open photo ${i + 1}`}
                  className="group block w-full overflow-hidden rounded-lg bg-secondary"
                >
                  <img
                    src={img.image_url}
                    alt={img.title ?? ""}
                    loading={i < 3 ? "eager" : "lazy"}
                    decoding="async"
                    className="w-full transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </button>
              </StaggerItem>
            ))}
          </StaggerList>
        ) : (
          <EmptyState
            Icon={ImageIcon}
            title="Photos are coming soon"
            body="Pictures from school life will appear here once they are added."
          />
        )}
      </section>

      <DialogPrimitive.Root open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-navy-deep/90 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 outline-none"
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") step(1);
              if (e.key === "ArrowLeft") step(-1);
            }}
          >
            <DialogPrimitive.Title className="sr-only">
              {current?.title || "Gallery photo"}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Use the arrow keys to move between photos. Press Escape to close.
            </DialogPrimitive.Description>
            <AnimatePresence mode="wait" initial>
              {current && (
                <motion.figure
                  key={active}
                  className="flex max-h-full max-w-5xl flex-col items-center"
                  initial={{ opacity: 0, x: dir * 48, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: dir * -48, transition: { duration: 0.18 } }}
                  transition={{ duration: 0.4, ease: EASE }}
                >
                  <img
                    src={current.image_url}
                    alt={current.title ?? ""}
                    className="max-h-[78dvh] w-auto max-w-full rounded-lg object-contain"
                  />
                  <figcaption className="mt-3 flex items-center gap-3 text-sm text-white/80">
                    {current.title && <span>{current.title}</span>}
                    <span className="label-mono text-white/55">
                      {(active ?? 0) + 1} / {list.length}
                    </span>
                  </figcaption>
                </motion.figure>
              )}
            </AnimatePresence>
            <DialogPrimitive.Close
              className="press absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
            {list.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous photo"
                  className="press absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next photo"
                  className="press absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md bg-white/10 text-white hover:bg-white/20"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
