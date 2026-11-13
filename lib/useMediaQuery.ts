import { useCallback, useSyncExternalStore } from "react";

/**
 * Tailwind's default breakpoints (`--breakpoint-*` in tailwindcss/theme.css).
 * useMediaQuery.unit.test.ts fails if these drift from Tailwind or from an
 * override in app/globals.css.
 */
export const BREAKPOINTS = {
  sm: "40rem",
  md: "48rem",
  lg: "64rem",
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/** Media query matching viewports narrower than the given breakpoint (Tailwind's `max-*` variant). */
export function belowBreakpoint(breakpoint: Breakpoint) {
  return `(width < ${BREAKPOINTS[breakpoint]})`;
}

/** Media query matching viewports at or above the given breakpoint (Tailwind's unprefixed `sm:` etc.). */
export function atLeastBreakpoint(breakpoint: Breakpoint) {
  return `(width >= ${BREAKPOINTS[breakpoint]})`;
}

// One MediaQueryList per query, shared by every subscriber and snapshot read.
const mediaQueryLists = new Map<string, MediaQueryList>();

function getMediaQueryList(query: string) {
  let mediaQueryList = mediaQueryLists.get(query);
  if (!mediaQueryList) {
    mediaQueryList = window.matchMedia(query);
    mediaQueryLists.set(query, mediaQueryList);
  }
  return mediaQueryList;
}

const getServerSnapshot = () => false;

/**
 * Subscribes to a CSS media query. Returns `false` during server rendering and
 * hydration, then the real match on the client.
 *
 * Use this only where the component structure has to change; keep purely
 * visual differences in CSS (`sm:hidden`, etc.).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaQueryList = getMediaQueryList(query);
      mediaQueryList.addEventListener("change", onChange);
      return () => mediaQueryList.removeEventListener("change", onChange);
    },
    [query],
  );
  const getSnapshot = useCallback(() => getMediaQueryList(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
