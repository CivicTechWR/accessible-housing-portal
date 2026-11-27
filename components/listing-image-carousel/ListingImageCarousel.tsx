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
import { PhotoEdge } from "@/components/listings-card/ListingsCard";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { GridViewIcon } from "@hugeicons/core-free-icons";

/**
 * From this many photos, wide screens show a grid instead of the carousel: a large photo with two
 * stacked tiles beside it, or with a 2×2 block of tiles once there are enough photos to fill it.
 * The grid's shape keeps every small tile near 4:3, so rooms aren't cropped to a strip.
 */
const GRID_MIN_PHOTOS = 3;
const QUAD_GRID_MIN_PHOTOS = 5;

function gridLayout(total: number) {
  return total >= QUAD_GRID_MIN_PHOTOS
    ? { shown: 5, className: "aspect-[16/5] grid-cols-[58fr_21fr_21fr]" }
    : { shown: 3, className: "aspect-[5/2] grid-cols-[66fr_34fr]" };
}

/** A 36px circle over the photo, with an invisible 44px hit area around it. */
const arrowClassName =
  "pointer-events-auto size-9 border-0 bg-white/95 text-neutral-900 shadow-md after:absolute after:-inset-1 hover:bg-white hover:text-neutral-900 dark:bg-white/95 dark:hover:bg-white";

interface ListingImageCarouselProps {
  images: Array<{ url: string; caption: string }>;
  altPrefix: string;
  /** Phones show the photo edge to edge, without rounded corners. */
  edgeToEdge?: boolean;
}

export function ListingImageCarousel({
  images,
  altPrefix,
  edgeToEdge = false,
}: ListingImageCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // The photo the lightbox opens on. The grid opens on the tile that was clicked; the carousel
  // opens on the shown slide.
  const [lightboxStart, setLightboxStart] = useState(0);
  const showsGrid = images.length >= GRID_MIN_PHOTOS;
  const grid = gridLayout(images.length);
  const photoRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusWasInSlides = useRef(false);

  const onSelect = useCallback(() => {
    if (!api) return;
    focusWasInSlides.current = api.containerNode().contains(document.activeElement);
    setCurrent(api.selectedScrollSnap());
  }, [api]);

  // When the slide changes while a photo has focus, from an arrow key, a mouse drag or a
  // change to the photo list, the slide that held focus becomes inert and focus drops to the
  // page. Move it to the new photo instead. Focus elsewhere, such as on the Next button, is
  // left alone. preventScroll stops the browser scrolling Embla's overflow-hidden viewport.
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

  function openLightbox(index: number) {
    setLightboxStart(index);
    setLightboxOpen(true);
  }

  return (
    <div className="relative w-full">
      {/* At the 1024px page width the grid is 320–410px tall, so Apply and the accessibility
          heading stay on the first screen. */}
      {showsGrid && (
        <div
          className={cn(
            "relative hidden grid-rows-2 gap-2 overflow-hidden rounded-xl md:grid",
            grid.className,
          )}
        >
          {images.slice(0, grid.shown).map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              className={cn(
                "group relative min-h-0 cursor-zoom-in overflow-hidden bg-muted focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-primary",
                index === 0 && "row-span-2",
              )}
              aria-label={`Open photo ${index + 1} of ${images.length}`}
              onClick={() => openLightbox(index)}
            >
              <img
                src={image.url}
                alt={image.caption || `${altPrefix} image ${index + 1}`}
                className="size-full object-cover transition duration-300 group-hover:brightness-90"
              />
              <PhotoEdge />
            </button>
          ))}
          <button
            type="button"
            onClick={() => openLightbox(0)}
            className="absolute right-4 bottom-4 inline-flex h-10 items-center gap-2 rounded-lg border border-foreground/15 bg-background px-3.5 text-sm font-medium text-foreground shadow-md hover:bg-muted"
          >
            <HugeiconsIcon icon={GridViewIcon} strokeWidth={2} className="size-4" aria-hidden />
            Show all {images.length} photos
          </button>
        </div>
      )}
      <Carousel
        className={cn("w-full", showsGrid && "md:hidden")}
        opts={{ loop: true }}
        setApi={setApi}
      >
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem
              key={`${image.url}-${index}`}
              // Keep off-screen photo buttons out of the tab order and screen reader.
              aria-hidden={index !== current}
              inert={index !== current}
            >
              <button
                ref={(node) => {
                  photoRefs.current[index] = node;
                }}
                type="button"
                className={cn(
                  "relative block w-full cursor-zoom-in overflow-hidden rounded-xl bg-muted focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-primary",
                  edgeToEdge && "max-sm:rounded-none",
                )}
                aria-label={`View image ${index + 1} of ${images.length} larger`}
                onClick={() => openLightbox(current)}
              >
                <img
                  src={image.url}
                  alt={image.caption || `${altPrefix} image ${index + 1}`}
                  className="aspect-[4/3] w-full object-cover md:aspect-[2/1] lg:aspect-auto lg:h-100"
                />
                <PhotoEdge />
                {/* A solid strip over the bottom of the photo, so the caption stays readable on a
                    bright photo. Hidden from screen readers, which get it as the photo's alt text. */}
                {image.caption && (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 bg-black/72 px-3 py-2 text-left text-sm text-white"
                  >
                    {image.caption}
                  </span>
                )}
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
        {images.length > 1 && (
          // Phones swipe between photos, so they get only the counter.
          <div className="pointer-events-none absolute inset-0">
            <span className="absolute top-3 right-3 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              {current + 1} / {images.length}
            </span>
            <CarouselPrevious size="icon" className={cn("left-3 max-sm:hidden", arrowClassName)} />
            <CarouselNext size="icon" className={cn("right-3 max-sm:hidden", arrowClassName)} />
          </div>
        )}
      </Carousel>
      <Lightbox
        images={images}
        startIndex={lightboxStart}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        title={`Photos of ${altPrefix}`}
        altPrefix={altPrefix}
      />
    </div>
  );
}
