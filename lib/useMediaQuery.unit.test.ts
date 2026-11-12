import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { atLeastBreakpoint, belowBreakpoint, BREAKPOINTS, useMediaQuery } from "./useMediaQuery";

type Listener = () => void;

function installMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<Listener>();
  const matchMedia = jest.fn((query: string) => ({
    media: query,
    get matches() {
      return matches;
    },
    addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
  }));
  Object.defineProperty(window, "matchMedia", { configurable: true, value: matchMedia });

  return {
    matchMedia,
    listeners,
    setMatches(next: boolean) {
      matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

describe("breakpoints", () => {
  it("match Tailwind's defaults", () => {
    expect(BREAKPOINTS).toEqual({ sm: "40rem", md: "48rem", lg: "64rem" });
  });

  it("build range media queries", () => {
    expect(belowBreakpoint("sm")).toBe("(width < 40rem)");
    expect(atLeastBreakpoint("lg")).toBe("(width >= 64rem)");
  });
});

describe("useMediaQuery", () => {
  let media: ReturnType<typeof installMatchMedia>;

  beforeEach(() => {
    media = installMatchMedia(true);
  });

  afterEach(() => {
    // @ts-expect-error -- remove the stub so tests stay isolated
    delete window.matchMedia;
  });

  it("returns the current match on the client", () => {
    const { result } = renderHook(() => useMediaQuery(belowBreakpoint("sm")));

    expect(result.current).toBe(true);
    expect(media.matchMedia).toHaveBeenCalledWith("(width < 40rem)");
  });

  it("updates when the media query changes", () => {
    const { result } = renderHook(() => useMediaQuery(belowBreakpoint("sm")));

    act(() => media.setMatches(false));
    expect(result.current).toBe(false);

    act(() => media.setMatches(true));
    expect(result.current).toBe(true);
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useMediaQuery(belowBreakpoint("sm")));
    expect(media.listeners.size).toBe(1);

    unmount();
    expect(media.listeners.size).toBe(0);
  });

  it("returns false when rendered on the server", () => {
    function Probe() {
      return createElement("span", null, String(useMediaQuery(belowBreakpoint("sm"))));
    }

    expect(renderToString(createElement(Probe))).toBe("<span>false</span>");
  });
});
