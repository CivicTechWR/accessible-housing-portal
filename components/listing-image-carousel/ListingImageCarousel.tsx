"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Lightbox } from "@/components/lightbox/Lightbox";

interface ListingImageCarouselProps {
  images: Array<{ url: string; caption: string }>;
  altPrefix: string;
}

export function ListingImageCarousel({ images, altPrefix }: ListingImageCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const photoRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusWasInSlides = useRef(false);

  const onSelect = useCallback(() => {
    if (!api) return;
    focusWasInSlides.current = api.containerNode().contains(document.activeElement);
    setCurrent(api.selectedScrollSnap());
  }, [api]);

  // The carousel handles arrow keys pressed on a photo, and the slide that held focus
  // becomes inert, which drops focus to the page. Move it to the new photo instead.
  // preventScroll stops the browser scrolling Embla's overflow-hidden viewport.
  useEffect(() => {
    if (!focusWasInSlides.current) return;
    focusWasInSlides.current = false;
    photoRefs.current[current]?.focus({ preventScroll: true });
  }, [current]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    // When the photos change, Embla rebuilds and picks a slide without a select event.
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, onSelect]);

  return (
    <div className="relative w-full">
      <Carousel className="w-full" opts={{ loop: true }} setApi={setApi}>
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem
              key={`${image.url}-${index}`}
              // Keep off-screen photo buttons out of the tab order and screen reader.
              aria-hidden={index !== current}
              inert={index !== current}
            >
              <div>
                <button
                  ref={(node) => {
                    photoRefs.current[index] = node;
                  }}
                  type="button"
                  className="block w-full cursor-zoom-in overflow-hidden rounded-lg focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-primary"
                  aria-label={`View image ${index + 1} of ${images.length} larger`}
                  onClick={() => setLightboxOpen(true)}
                >
                  <img
                    src={image.url}
                    alt={image.caption || `${altPrefix} image ${index + 1}`}
                    className="h-64 w-full object-cover sm:h-80"
                  />
                </button>
                <div className="flex items-center justify-between mt-2">
                  {image.caption && (
                    <p className="text-sm text-muted-foreground">{image.caption}</p>
                  )}
                  <span
                    className={`inline-flex items-center justify-center rounded-full bg-black/60 px-2.5 py-1 text-sm font-medium text-white ${image.caption ? "" : "w-full text-center"}`}
                  >
                    {current + 1} / {images.length}
                  </span>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 shadow-lg hover:bg-white dark:bg-background/90 dark:hover:bg-background" />
        <CarouselNext className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 shadow-lg hover:bg-white dark:bg-background/90 dark:hover:bg-background" />
      </Carousel>
      <Lightbox
        images={images}
        startIndex={current}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        title={`Photos of ${altPrefix}`}
        altPrefix={altPrefix}
      />
    </div>
  );
}
