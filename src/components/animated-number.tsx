"use client";

import { useCountUp } from "@/lib/use-count-up";

interface AnimatedNumberProps {
  /** Target numeric value */
  value: number;
  /** Number of decimal places to display */
  decimals?: number;
  /** Prefix string (e.g. "دج") */
  prefix?: string;
  /** Suffix string (e.g. "%") */
  suffix?: string;
  /** Animation duration in ms (default 800) */
  duration?: number;
  /** Locale for number formatting (default "fr-DZ") */
  locale?: string;
  className?: string;
}

/**
 * Renders a number that animates (counts up) when it changes.
 * Uses useCountUp hook with easeOutCubic easing.
 * Respects prefers-reduced-motion (shows final value instantly).
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 800,
  locale = "fr-DZ",
  className,
}: AnimatedNumberProps) {
  const animated = useCountUp(value, duration);
  const formatted = animated.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
