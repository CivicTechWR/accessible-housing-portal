import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { atLeastBreakpoint, belowBreakpoint, BREAKPOINTS, useMediaQuery } from "./useMediaQuery";

type Listener = () => void;

/** Collects `--breakpoint-<name>: <value>;` declarations from a stylesheet. */
function readBreakpoints(cssPath: string) {
  const css = readFileSync(cssPath, "utf8");
  const breakpoints: Record<string, string> = {};
  for (const match of css.matchAll(/--breakpoint-([\w-]+)\s*:\s*([^;]+);/g)) {
    const [, name = "", value = ""] = match;
    breakpoints[name] = value.trim();
  }
  return breakpoints;
}

describe("breakpoints", () => {
  it("match Tailwind's theme, including any override in app/globals.css", () => {
    const tailwindTheme = readBreakpoints(require.resolve("tailwindcss/theme.css"));
    const projectTheme = readBreakpoints(path.join(__dirname, "../app/globals.css"));
    const effective = { ...tailwindTheme, ...projectTheme };

    for (const [name, value] of Object.entries(BREAKPOINTS)) {
      expect({ name, value: effective[name] }).toEqual({ name, value });
    }
  });

  it("build range media queries", () => {
    expect(belowBreakpoint("sm")).toBe("(width < 40rem)");
    expect(atLeastBreakpoint("lg")).toBe("(width >= 64rem)");
  });
});

describe("useMediaQuery", () => {
  // The hook keeps one MediaQueryList per query for the life of the module,
  // so the stub is installed once and its state reset between tests.
  let matches = true;
  const listeners = new Set<Listener>();
  const matchMedia = jest.fn((query: string) => ({
    media: query,
    get matches() {
      return matches;
    },
    addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
  }));

  function setMatches(next: boolean) {
    matches = next;
    listeners.forEach((listener) => listener());
  }

  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", { configurable: true, value: matchMedia });
  });

  beforeEach(() => {
    matches = true;
  });

  afterAll(() => {
    // @ts-expect-error -- remove the stub so other suites stay isolated
    delete window.matchMedia;
  });

  it("returns the current match on the client", () => {
    const { result } = renderHook(() => useMediaQuery(belowBreakpoint("sm")));

    expect(result.current).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith("(width < 40rem)");
  });

  it("updates when the media query changes", () => {
    const { result } = renderHook(() => useMediaQuery(belowBreakpoint("sm")));

    act(() => setMatches(false));
    expect(result.current).toBe(false);

    act(() => setMatches(true));
    expect(result.current).toBe(true);
  });

  it("reuses one MediaQueryList per query", () => {
    matchMedia.mockClear();
    const first = renderHook(() => useMediaQuery(atLeastBreakpoint("md")));
    const second = renderHook(() => useMediaQuery(atLeastBreakpoint("md")));
    act(() => setMatches(false));

    expect(first.result.current).toBe(false);
    expect(second.result.current).toBe(false);
    expect(matchMedia).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useMediaQuery(belowBreakpoint("sm")));
    expect(listeners.size).toBe(1);

    unmount();
    expect(listeners.size).toBe(0);
  });

  it("returns false when rendered on the server", () => {
    function Probe() {
      return createElement("span", null, String(useMediaQuery(belowBreakpoint("sm"))));
    }

    expect(renderToString(createElement(Probe))).toBe("<span>false</span>");
  });
});
