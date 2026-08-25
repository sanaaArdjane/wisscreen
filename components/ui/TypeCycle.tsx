"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Phase = "holding" | "deleting" | "typing";

/**
 * Types a rotating list of words out character by character, behind a glowing
 * caret. The first word is rendered in full on the server (no empty heading for
 * crawlers, no layout shift) and the cycle starts by deleting it.
 *
 * `words` must be a stable reference — pass a module-level constant, not an
 * inline array literal, or the effect will restart on every render.
 */
export function TypeCycle({
  words,
  className,
  caretClassName,
}: {
  words: string[];
  className?: string;
  caretClassName?: string;
}) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(words[0] ?? "");
  const [phase, setPhase] = useState<Phase>("holding");

  useEffect(() => {
    if (words.length === 0) return;
    const current = words[index % words.length];

    let delay: number;
    let step: () => void;

    if (phase === "holding") {
      delay = 2300;
      step = () => setPhase("deleting");
    } else if (phase === "deleting") {
      if (text.length === 0) {
        delay = 180;
        step = () => {
          setIndex((i) => (i + 1) % words.length);
          setPhase("typing");
        };
      } else {
        delay = 38;
        step = () => setText(text.slice(0, -1));
      }
    } else {
      if (text === current) {
        delay = 60;
        step = () => setPhase("holding");
      } else {
        delay = 68;
        step = () => setText(current.slice(0, text.length + 1));
      }
    }

    // setState runs inside the timeout (async), never synchronously in the effect
    // body — that keeps this clear of the cascading-render lint rule.
    const id = setTimeout(step, delay);
    return () => clearTimeout(id);
  }, [text, phase, index, words]);

  return (
    <span className={cn("inline-flex items-baseline", className)}>
      <span>{text}</span>
      <span
        aria-hidden="true"
        className={cn(
          "animate-caret ml-1.5 inline-block h-[0.78em] w-[0.07em] translate-y-[0.04em] rounded-full bg-signal-soft",
          "shadow-[0_0_10px_2px_rgba(55,159,158,0.75)]",
          caretClassName,
        )}
      />
    </span>
  );
}
