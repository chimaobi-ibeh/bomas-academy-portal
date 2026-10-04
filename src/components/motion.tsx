import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type HTMLMotionProps,
} from "framer-motion";
import { cn } from "@/lib/utils";

// One easing everywhere: a confident deceleration, no bounce. Reduced motion
// drops movement and keeps opacity. Content is never hidden without motion:
// every reveal starts from `initial` states that animate in on mount, and
// below-the-fold reveals use `whileInView` with a safe `once` viewport.
export const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * A true mask reveal: each composed line travels through its own clipping window.
 * Pure CSS, so it runs on the server-rendered HTML before any JavaScript loads.
 */
export function HeroTitle({
  lines,
  className,
  as: Tag = "h1",
}: {
  lines: string[];
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <Tag className={className} aria-label={lines.join(" ")}>
      {lines.map((line, index) => (
        <span key={`${index}-${line}`} aria-hidden="true" className="mask-line mask-css">
          <span style={{ "--d": `${0.06 + index * 0.08}s` } as React.CSSProperties}>{line}</span>
        </span>
      ))}
    </Tag>
  );
}

/**
 * The same mask reveal, triggered when the heading scrolls into view.
 * The text is in the DOM and readable either way.
 */
export function MaskLines({
  lines,
  className,
  as: Tag = "h2",
}: {
  lines: string[];
  className?: string;
  as?: "h1" | "h2" | "p";
}) {
  const reduce = useReducedMotion();
  // Watch the heading itself. The lines start pushed out of their clipping windows, so an
  // observer on the lines would see nothing visible and never fire.
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  return (
    <Tag
      ref={ref as React.RefObject<HTMLHeadingElement & HTMLParagraphElement>}
      className={className}
      aria-label={lines.join(" ")}
    >
      {lines.map((line, index) => (
        <span key={`${index}-${line}`} aria-hidden="true" className="mask-line">
          <motion.span
            className="block"
            initial={reduce ? false : { y: "110%" }}
            animate={inView ? { y: 0 } : undefined}
            transition={{ duration: 0.8, delay: index * 0.08, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/** Split a title into balanced lines on word boundaries for the mask reveal. */
export function splitTitle(text: string, maxChars = 22): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur + " " + w).length > maxChars) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + " " + w : w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [text];
}

/** Fade and rise on load. Pure CSS, so it needs no JavaScript to appear. */
export function Rise({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <div className={cn("rise", className)} style={{ "--d": `${delay}s` } as React.CSSProperties}>
      {children}
    </div>
  );
}

/** Image/panel reveal from the side the layout implies, once, in view. */
export function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "left" | "right" | "up";
}) {
  const reduce = useReducedMotion();
  const offset =
    direction === "left"
      ? { x: -36, y: 0 }
      : direction === "right"
        ? { x: 36, y: 0 }
        : { x: 0, y: 28 };
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * True while an element is in view, and it plays again every time: it turns on once a good
 * part of the element is visible and only turns off after it has fully left the screen, so
 * a slow scroll near the edge never makes it flicker.
 */
export function useReplayInView<T extends Element>(ref: React.RefObject<T | null>, enter = 0.3) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        // A tall element can never reach `enter`, so a screenful of it also counts.
        const tall = entry.intersectionRect.height >= window.innerHeight * 0.5;
        if (entry.intersectionRatio >= enter || tall) {
          setOn(true);
        } else if (!entry.isIntersecting) {
          setOn(false);
        }
      },
      { threshold: [0, 0.1, 0.2, enter, 0.5, 0.75] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, enter]);
  return on;
}

/** A list whose items arrive in order (capped total delay). `replay` plays it on every pass. */
export function StaggerList({
  children,
  className,
  as = "ul",
  style,
  replay = false,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "ul" | "ol" | "div" | "dl";
  style?: React.CSSProperties;
  replay?: boolean;
}) {
  const Tag = motion[as] as typeof motion.ul;
  const ref = useRef<HTMLElement>(null);
  const on = useReplayInView(ref, 0.2);
  const variants = { shown: { transition: { staggerChildren: 0.06 } } };
  if (replay) {
    return (
      <Tag
        ref={ref as React.RefObject<HTMLUListElement>}
        className={className}
        style={style}
        initial="hidden"
        animate={on ? "shown" : "hidden"}
        variants={variants}
      >
        {children}
      </Tag>
    );
  }
  return (
    <Tag
      className={className}
      style={style}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.1 }}
      variants={variants}
    >
      {children}
    </Tag>
  );
}

const staggerItem = {
  hidden: { opacity: 0, y: 14, transition: { duration: 0 } },
  shown: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

export function StaggerItem({
  children,
  className,
  as = "li",
  ...rest
}: { children: React.ReactNode; className?: string; as?: "li" | "div" } & HTMLMotionProps<"li">) {
  const Tag = motion[as] as typeof motion.li;
  return (
    <Tag className={className} variants={staggerItem} {...rest}>
      {children}
    </Tag>
  );
}

/** A rule that draws from left to right as it enters view. */
export function DrawLine({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden="true"
      className={cn("block h-px origin-left bg-foreground/25", className)}
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 1 }}
      transition={{ duration: 0.9, ease: EASE }}
    />
  );
}

/** Counts a figure up the first time it is seen. Falls back to the text as given. */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 1 });
  const reduce = useReducedMotion();
  const match = value.match(/^(\D*)(\d[\d,]*)(.*)$/);
  const target = match ? parseInt(match[2].replace(/,/g, ""), 10) : NaN;
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => {
    if (!inView || reduce || Number.isNaN(target)) return;
    const controls = animate(0, target, {
      duration: 1.1,
      ease: EASE,
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduce, target]);
  if (!match || shown === null) {
    return (
      <span ref={ref} className={cn("tabular-nums", className)}>
        {value}
      </span>
    );
  }
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {match[1]}
      {shown.toLocaleString("en-NG")}
      {match[3]}
    </span>
  );
}

/**
 * An image that drifts slightly slower than the page, inside a fixed frame.
 * Used on a few large photographs only; off for reduced motion.
 */
export function ParallaxImage({
  src,
  alt,
  className,
  imgClassName,
  width,
  height,
  loading = "lazy",
  amount = 7,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  width?: number;
  height?: number;
  loading?: "eager" | "lazy";
  amount?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${amount}%`, `${amount}%`]);
  return (
    <div ref={ref} className={cn("overflow-hidden", className)}>
      <motion.img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        style={reduce ? undefined : { y, scale: 1 + (amount * 2.4) / 100 }}
        className={cn("h-full w-full object-cover", imgClassName)}
      />
    </div>
  );
}

/** A thin gold bar that fills as the page is read. For long articles. */
export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.3 });
  return (
    <motion.span
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gold"
      style={{ scaleX }}
    />
  );
}
