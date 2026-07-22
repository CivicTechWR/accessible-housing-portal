"use client";

import { useEffect, useRef } from "react";

type HomeSnapScrollerProps = {
  children: React.ReactNode;
};

export function HomeSnapScroller({ children }: HomeSnapScrollerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wheelLockRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (wheelLockRef.current) {
        event.preventDefault();
        return;
      }

      const sections = Array.from(container.querySelectorAll<HTMLElement>("[data-home-section]"));
      if (sections.length === 0) return;

      const currentIndex = sections.findIndex((section) => {
        const sectionTop = section.offsetTop;
        const sectionBottom = sectionTop + section.offsetHeight;
        const scrollTop = container.scrollTop;
        return scrollTop >= sectionTop - 8 && scrollTop < sectionBottom - 8;
      });

      const direction = Math.sign(event.deltaY);
      if (direction === 0) return;

      const nextIndex =
        direction > 0
          ? Math.min(currentIndex + 1, sections.length - 1)
          : Math.max(currentIndex - 1, 0);

      if (nextIndex === currentIndex) return;

      event.preventDefault();
      wheelLockRef.current = true;
      sections[nextIndex].scrollIntoView({ behavior: "smooth", block: "start" });

      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 700);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <main
      ref={containerRef}
      className="h-full min-h-0 overflow-y-auto overscroll-contain scroll-smooth"
    >
      {children}
    </main>
  );
}
