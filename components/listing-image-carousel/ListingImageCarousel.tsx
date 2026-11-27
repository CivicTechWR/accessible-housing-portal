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
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { GridViewIcon } from "@hugeicons/core-free-icons";

/** From this many photos, wide screens show a grid (one large, up to four small) instead of the carousel. */
const GRID_MIN_PHOTOS = 3;
const GRID_MAX_PHOTOS = 5;

/** Column spans for the small tiles, so three or four photos still fill the grid. */
function gridTileClassName(index: number, total: number) {
  if (index === 0) return "col-span-2 row-span-2";
  if (total === 3) return "col-span-2";
  if (total === 4 && index === 1) return "col-span-2";
  return "";
}

interface ListingImageCarouselProps {
  images: Array<{ url: string; caption: string }>;
  altPrefix: string;
}

export function ListingImageCarousel({ images, altPrefix }: ListingImageCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // The photo the lightbox opens on. The grid opens on the tile that was clicked; the carousel
  // opens on the shown slide.
  const [lightboxStart, setLightboxStart] = useState(0);
  const showsGrid = images.length >= GRID_MIN_PHOTOS;
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
      {showsGrid && (
        <div className="relative hidden aspect-[2/1] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-xl md:grid">
          {images.slice(0, GRID_MAX_PHOTOS).map((image, index, shown) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              className={cn(
                "group relative min-h-0 cursor-zoom-in overflow-hidden bg-muted focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-primary",
                gridTileClassName(index, shown.length),
              )}
              aria-label={`Open photo ${index + 1} of ${images.length}`}
              onClick={() => openLightbox(index)}
            >
              <img
                src={image.url}
                alt={image.caption || `${altPrefix} image ${index + 1}`}
                className="size-full object-cover transition duration-300 group-hover:brightness-90"
              />
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
                className="block w-full cursor-zoom-in overflow-hidden rounded-xl bg-muted focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-primary"
                aria-label={`View image ${index + 1} of ${images.length} larger`}
                onClick={() => openLightbox(current)}
              >
                <img
                  src={image.url}
                  alt={image.caption || `${altPrefix} image ${index + 1}`}
                  className="aspect-[4/3] w-full object-cover md:aspect-[2/1]"
                />
              </button>
              {image.caption && (
                <p className="mt-2 text-sm text-muted-foreground">{image.caption}</p>
              )}
            </CarouselItem>
          ))}
        </CarouselContent>
        {images.length > 1 && (
          // An overlay the size of the photo, so the arrows centre on the photo, not the caption.
          <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[4/3] md:aspect-[2/1]">
            <span className="absolute top-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-[13px] font-medium text-white tabular-nums">
              {current + 1} / {images.length}
            </span>
            <CarouselPrevious
              size="icon"
              className="pointer-events-auto left-3 size-10 border-0 bg-white/95 text-neutral-900 shadow-md hover:bg-white hover:text-neutral-900 dark:bg-white/95 dark:hover:bg-white"
            />
            <CarouselNext
              size="icon"
              className="pointer-events-auto right-3 size-10 border-0 bg-white/95 text-neutral-900 shadow-md hover:bg-white hover:text-neutral-900 dark:bg-white/95 dark:hover:bg-white"
            />
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
