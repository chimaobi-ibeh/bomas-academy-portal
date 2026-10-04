import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE, useReplayInView } from "@/components/motion";
import { VALUE_ICONS } from "@/components/icons";

export type BomasValue = { key: string; letter: string; title: string; motto?: string };

const STEP = 0.62; // seconds between one letter's turn and the next
const TYPE = 0.045; // seconds between the letters of a word

/**
 * The BOMAS sequence. Each giant letter rises into place, then the value it stands for
 * is spelled out beneath it with a line drawing under the word, then its motto fades in,
 * and only then does the next letter take its turn. Reduced motion shows the finished state.
 * The words are real text in the page the whole time, so screen readers get them at once.
 */
export function BomasLetters({ values }: { values: BomasValue[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const inView = useReplayInView(ref);
  const reduce = useReducedMotion();
  const on = inView || Boolean(reduce);
  // Plays on every pass: the timed sequence runs on the way in, the reset snaps back instantly.
  const seq = (spec: object) => (on ? spec : { duration: 0 });

  return (
    <ul ref={ref} className="mt-8 grid gap-5 sm:grid-cols-5 sm:gap-4">
      {values.map((v, i) => {
        const t0 = i * STEP + 0.1;
        const first = v.title.slice(0, 1);
        const rest = v.title.slice(1).split("");
        const wordStart = t0 + 0.45;
        const wordEnd = wordStart + rest.length * TYPE;
        const Icon = VALUE_ICONS[v.key];
        return (
          <li key={v.letter} className="grid grid-cols-[4.75rem_1fr] items-center gap-4 sm:block">
            <span aria-hidden="true" className="mask-line">
              <motion.span
                className="block font-display text-[4.75rem] font-bold leading-[0.85] tracking-[-0.06em] sm:text-[clamp(3.6rem,15vw,12rem)]"
                initial={reduce ? false : { y: "105%", rotate: 3 }}
                animate={on ? { y: 0, rotate: 0 } : { y: "105%", rotate: 3 }}
                transition={seq({ duration: 0.75, ease: EASE, delay: t0 })}
              >
                {v.letter}
              </motion.span>
            </span>

            <div className="min-w-0 sm:mt-4">
              <motion.span
                aria-hidden="true"
                className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-navy-deep text-gold"
                initial={reduce ? false : { opacity: 0, scale: 0.6, rotate: -12 }}
                animate={
                  on ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0.6, rotate: -12 }
                }
                transition={seq({
                  type: "spring",
                  stiffness: 320,
                  damping: 18,
                  delay: wordStart - 0.1,
                })}
              >
                {Icon && <Icon className="h-5 w-5" />}
              </motion.span>
              <p className="font-display text-xl font-bold leading-tight sm:text-lg lg:text-xl">
                <span className="sr-only">{v.title}</span>
                <span aria-hidden="true">
                  <motion.span
                    initial={reduce ? false : { opacity: 0 }}
                    animate={on ? { opacity: 1 } : { opacity: 0 }}
                    transition={seq({ duration: 0.2, delay: wordStart })}
                  >
                    {first}
                  </motion.span>
                  {rest.map((ch, k) => (
                    <motion.span
                      key={k}
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                      transition={seq({
                        duration: 0.3,
                        ease: EASE,
                        delay: wordStart + 0.05 + k * TYPE,
                      })}
                      className="inline-block"
                    >
                      {ch}
                    </motion.span>
                  ))}
                </span>
              </p>
              <motion.span
                aria-hidden="true"
                className="mt-1.5 block h-[3px] origin-left bg-navy-deep"
                initial={reduce ? false : { scaleX: 0 }}
                animate={on ? { scaleX: 1 } : { scaleX: 0 }}
                transition={seq({
                  duration: wordEnd - wordStart + 0.2,
                  ease: EASE,
                  delay: wordStart,
                })}
              />
              {v.motto && (
                <motion.p
                  className="mt-2 text-[13px] italic leading-snug text-navy-deep/80"
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
                  transition={seq({ duration: 0.45, ease: EASE, delay: wordEnd + 0.15 })}
                >
                  &ldquo;{v.motto}&rdquo;
                </motion.p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
