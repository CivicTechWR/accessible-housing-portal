"use client";

import * as React from "react";
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
  /** Used for alt text when an image has no caption, e.g. "Unit 204 image 2 of 5". */
  altPrefix?: string;
};

function wrapIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function getImageAlt(image: LightboxImage, index: number, total: number, altPrefix: string) {
  return image.caption || `${altPrefix} ${index + 1} of ${total}`;
}

const navButtonClassName =
  "size-11 rounded-full bg-background/90 text-foreground shadow-lg hover:bg-background [&_svg:not([class*='size-'])]:size-5";

function Lightbox({
  images,
  startIndex = 0,
  open,
  onOpenChange,
  title = "Photos",
  altPrefix = "Image",
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
}: Required<Pick<LightboxProps, "images" | "startIndex" | "title" | "altPrefix">>) {
  // Captures the focused element (the opener) on the render where the lightbox opens.
  const restoreFocusToOpener = useDialogOpenerFocus();
  const total = images.length;
  const initialIndex = wrapIndex(startIndex, total);
  const [api, setApi] = React.useState<CarouselApi>();
  const [index, setIndex] = React.useState(initialIndex);
  const hasMultiple = total > 1;
  const caption = images[index]?.caption ?? "";

  React.useEffect(() => {
    if (!api) return;
    // Keep the counter in sync when the user swipes.
    const onSelect = () => setIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const goTo = React.useCallback(
    (next: number) => {
      const target = wrapIndex(next, total);
      setIndex(target);
      api?.scrollTo(target);
    },
    [api, total],
  );

  function handleKeyDownCapture(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!hasMultiple) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    // Handle arrows anywhere in the dialog, and stop the carousel's own
    // handler so the lightbox can wrap from the last image to the first.
    event.preventDefault();
    event.stopPropagation();
    goTo(event.key === "ArrowLeft" ? index - 1 : index + 1);
  }

  return (
    <DialogPanel
      aria-describedby={undefined}
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

      <Carousel
        className="min-h-0 flex-1"
        opts={{ startIndex: initialIndex }}
        setApi={setApi}
        aria-label={title}
      >
        <CarouselContent className="h-[calc(100dvh-8.5rem)]">
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
              onClick={() => goTo(index - 1)}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
              <span className="sr-only">Previous image</span>
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              className={cn(navButtonClassName, "absolute top-1/2 right-3 -translate-y-1/2")}
              onClick={() => goTo(index + 1)}
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
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {`Image ${index + 1} of ${total}${caption ? `: ${caption}` : ""}`}
        </p>
      </div>
    </DialogPanel>
  );
}

export { Lightbox };
