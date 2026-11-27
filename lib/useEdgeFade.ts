import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

const FADE = "3.5rem";

/**
 * Fades the left and right edges of a horizontally scrolling row while there is more content
 * past them, so a clipped chip or tab reads as "scroll for more" rather than as cut off.
 * Spread `onScroll` and `style` onto the element that `ref` points at.
 */
export function useEdgeFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const update = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const start = element.scrollLeft > 1;
    const end = element.scrollLeft + element.clientWidth < element.scrollWidth - 1;
    setEdges((current) =>
      current.start === start && current.end === end ? current : { start, end },
    );
  }, []);

  useEffect(() => {
    update();
    const element = ref.current;
    // Missing in some test environments; the row then shows without fades.
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    return () => observer.disconnect();
  }, [update]);

  const mask =
    edges.start || edges.end
      ? `linear-gradient(to right, ${edges.start ? "transparent" : "black"}, black ${FADE}, black calc(100% - ${FADE}), ${edges.end ? "transparent" : "black"})`
      : undefined;
  const style: CSSProperties | undefined = mask
    ? { maskImage: mask, WebkitMaskImage: mask }
    : undefined;

  return { ref, onScroll: update, style };
}
