"use client";

import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Dialog as DialogPrimitive } from "radix-ui";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  DialogOverlay,
  DialogPanel,
  DialogTitle,
  useDialogOpenerFocus,
} from "@/components/ui/dialog-shell";
import { cn } from "@/lib/utils";

export type LightboxImage = {
  url: string;
  caption: string;
};

type LightboxProps = {
  images: LightboxImage[];
  startIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Accessible name for the dialog. Screen readers announce it on open. */
  title?: string;
  /**
   * Names the images in alt text when an image has no caption: "Unit 204" gives
   * "Unit 204 image 2 of 5". Without it the alt text is "Image 2 of 5".
   */
  altPrefix?: string;
};

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function getImageAlt(image: LightboxImage, index: number, total: number, altPrefix?: string) {
  if (image.caption) return image.caption;
  const name = altPrefix ? `${altPrefix} image` : "Image";
  return `${name} ${index + 1} of ${total}`;
}

const navButtonClassName =
  "size-11 rounded-full bg-background/90 text-foreground shadow-lg hover:bg-background [&_svg:not([class*='size-'])]:size-5";

function Lightbox({
  images,
  startIndex = 0,
  open,
  onOpenChange,
  title = "Photos",
  altPrefix,
}: LightboxProps) {
  if (images.length === 0) return null;

  return (
    <DialogOverlay open={open} onOpenChange={onOpenChange} className="px-0">
      <LightboxPanel images={images} startIndex={startIndex} title={title} altPrefix={altPrefix} />
    </DialogOverlay>
  );
}

// Radix unmounts the portal content while the dialog is closed, so this state
// starts fresh at `startIndex` every time the lightbox opens.
function LightboxPanel({
  images,
  startIndex,
  title,
  altPrefix,
}: Required<Pick<LightboxProps, "images" | "startIndex" | "title">> &
  Pick<LightboxProps, "altPrefix">) {
  // Captures the focused element (the opener) on the render where the lightbox opens.
  const restoreFocusToOpener = useDialogOpenerFocus();
  const total = images.length;
  const initialIndex = wrapIndex(startIndex, total);
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setIndex] = useState(initialIndex);
  // The list can shrink while the lightbox is open, for example after a refetch. This keeps
  // the index in range for the render before Embla reports the slide it moved to.
  const index = Math.min(selectedIndex, total - 1);
  const hasMultiple = total > 1;
  const caption = images[index]?.caption ?? "";

  useEffect(() => {
    if (!api) return;
    // Keep the counter in sync when the user swipes. Embla also picks a new slide, without
    // a select event, when it rebuilds after the slides change.
    const onSelect = () => setIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  const step = useCallback(
    (direction: 1 | -1) => {
      const target = wrapIndex(index + direction, total);
      setIndex(target);
      if (!api) return;
      // scrollNext and scrollPrev keep the direction pressed. scrollTo takes the shortest way,
      // which with two images is a tie, so Next would slide back and forth. Embla turns
      // looping off when the slides cannot fill it, and then the ends need scrollTo to wrap.
      if (direction === 1 && api.canScrollNext()) api.scrollNext();
      else if (direction === -1 && api.canScrollPrev()) api.scrollPrev();
      else api.scrollTo(target);
    },
    [api, index, total],
  );

  function handleKeyDownCapture(event: KeyboardEvent<HTMLDivElement>) {
    if (!hasMultiple) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    // Leave browser shortcuts such as Alt+Left (Back) alone.
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    // Handle arrows anywhere in the dialog, including on the close button
    // outside the carousel, and stop the carousel's own handler so one key
    // press moves one image.
    event.preventDefault();
    event.stopPropagation();
    step(event.key === "ArrowLeft" ? -1 : 1);
  }

  return (
    <DialogPanel
      onCloseAutoFocus={restoreFocusToOpener}
      onKeyDownCapture={handleKeyDownCapture}
      className="flex h-dvh max-w-none flex-col rounded-none border-0 bg-background text-foreground shadow-none"
    >
      <DialogTitle className="sr-only">{title}</DialogTitle>

      <div className="flex h-14 shrink-0 items-center justify-between gap-4 px-4">
        <span className="text-sm font-medium tabular-nums" aria-hidden="true">
          {index + 1} / {total}
        </span>
        <DialogPrimitive.Close asChild>
          <Button variant="ghost" size="icon-lg" className="size-11 rounded-full [&_svg]:size-5">
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className="sr-only">Close</span>
          </Button>
        </DialogPrimitive.Close>
      </div>

      {/* The slides fill whatever height the header and caption leave. CarouselContent
          doesn't take a class for its viewport wrapper, so it's sized from here. */}
      <Carousel
        className="flex min-h-0 flex-1 flex-col [&>[data-slot=carousel-content]]:min-h-0 [&>[data-slot=carousel-content]]:flex-1"
        opts={{ startIndex: initialIndex, loop: true }}
        setApi={setApi}
      >
        <CarouselContent className="h-full">
          {images.map((image, imageIndex) => {
            const isCurrent = imageIndex === index;
            return (
              <CarouselItem
                key={`${image.url}-${imageIndex}`}
                aria-label={`${imageIndex + 1} of ${total}`}
                aria-hidden={!isCurrent}
                inert={!isCurrent}
                className="flex h-full items-center justify-center"
              >
                <img
                  src={image.url}
                  alt={getImageAlt(image, imageIndex, total, altPrefix)}
                  className="max-h-full max-w-full object-contain"
                  draggable={false}
                />
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {hasMultiple && (
          <>
            <Button
              variant="outline"
              size="icon-lg"
              className={cn(navButtonClassName, "absolute top-1/2 left-3 -translate-y-1/2")}
              onClick={() => step(-1)}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
              <span className="sr-only">Previous image</span>
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              className={cn(navButtonClassName, "absolute top-1/2 right-3 -translate-y-1/2")}
              onClick={() => step(1)}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
              <span className="sr-only">Next image</span>
            </Button>
          </>
        )}
      </Carousel>

      <div className="flex min-h-16 shrink-0 items-center justify-center px-4 py-3 text-center">
        <p className="text-sm text-muted-foreground" aria-hidden="true">
          {caption}
        </p>
        {/* As the dialog's description, this is read after its name on open. As a live
            region, it is read again on each image change. */}
        <DialogPrimitive.Description className="sr-only" aria-live="polite" aria-atomic="true">
          {`Image ${index + 1} of ${total}${caption ? `: ${caption}` : ""}`}
        </DialogPrimitive.Description>
      </div>
    </DialogPanel>
  );
}

export { Lightbox };
