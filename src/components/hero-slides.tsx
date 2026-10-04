import { useCallback, useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Pause, Play } from "@/components/icons";
import { cn } from "@/lib/utils";

export type HeroSlide = { id: string; src: string; label: string; focus?: string };

const DELAY = 6500; // milliseconds each photograph stays

/**
 * Drives the hero slideshow. It advances by itself, but never when the visitor prefers
 * reduced motion, when they have paused it, or while the tab is hidden.
 */
export function useSlideshow(count: number) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const playing = !reduce && !paused && !hidden && count > 1;

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % count), DELAY);
    return () => window.clearTimeout(timer);
  }, [playing, index, count]);

  const go = useCallback((i: number) => setIndex(i), []);
  return { index, go, paused, setPaused, playing };
}

/**
 * The photographs, stacked and cross-faded. Only the first is requested up front so the
 * page stays light; the others are fetched once the browser is idle.
 */
export function SlideLayer({ slides, index }: { slides: HeroSlide[]; index: number }) {
  const [rest, setRest] = useState(false);
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => setRest(true));
    return () => cancel(handle as number);
  }, []);

  return (
    <>
      {slides.map((s, i) =>
        i > 0 && !rest ? null : (
          <img
            key={s.id}
            src={s.src}
            alt={i === index ? `${s.label} pupils and teachers at Bomas Academy` : ""}
            aria-hidden={i === index ? undefined : true}
            width={1200}
            height={800}
            fetchPriority={i === 0 ? "high" : undefined}
            style={{ objectPosition: s.focus }}
            decoding="async"
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-out",
              i === index ? "opacity-100" : "opacity-0",
            )}
          />
        ),
      )}
    </>
  );
}

/** Segmented progress bar, one segment per photograph, plus a pause control. */
export function SlideControls({
  slides,
  index,
  go,
  paused,
  setPaused,
  playing,
  className,
}: {
  slides: HeroSlide[];
  index: number;
  go: (i: number) => void;
  paused: boolean;
  setPaused: (v: boolean) => void;
  playing: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Hero photographs"
      className={cn("flex items-center gap-2 text-white", className)}
    >
      <p className="label-mono mr-auto text-white/80" aria-live={playing ? "off" : "polite"}>
        {slides[index].label}
      </p>
      <div className="flex">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(i)}
            aria-label={`Show ${s.label}`}
            aria-current={i === index ? "true" : undefined}
            className="group flex h-11 w-12 items-center focus-visible:outline-none"
          >
            <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-white/30 group-focus-visible:ring-2 group-focus-visible:ring-gold">
              {i === index && (
                <span
                  key={`${index}-${playing}`}
                  className="absolute inset-0 origin-left rounded-full bg-gold"
                  style={
                    playing
                      ? { animation: "slide-progress 6500ms linear forwards" }
                      : { transform: "scaleX(1)" }
                  }
                />
              )}
              {i < index && <span className="absolute inset-0 rounded-full bg-white/70" />}
            </span>
          </button>
        ))}
      </div>
      {slides.length > 1 && (
        <button
          type="button"
          onClick={() => setPaused(!paused)}
          aria-label={paused ? "Play slideshow" : "Pause slideshow"}
          className="flex h-11 w-11 items-center justify-center rounded-md border border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
