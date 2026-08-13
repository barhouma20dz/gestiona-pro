"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animated count-up hook.
 * Animates a number from 0 (or previous value) to `target` over `duration` ms.
 * Uses requestAnimationFrame for smooth 60fps animation.
 * Respects prefers-reduced-motion.
 */
export function useCountUp(target: number, duration = 800): number {
  // Check reduced motion at render time (not in effect)
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // If reduced motion, just return target directly
  const [value, setValue] = useState(reducedMotion ? target : 0);
  const fromRef = useRef(reducedMotion ? target : 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const diff = target - from;

    // No change needed — skip animation entirely
    if (diff === 0) return;

    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + diff * eased;
      setValue(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      fromRef.current = target;
    };
  }, [target, duration]);

  return value;
}
