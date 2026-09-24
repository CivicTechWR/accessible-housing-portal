"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";

interface ListingImageCarouselProps {
  images: Array<{ url: string; caption: string }>;
  altPrefix: string;
}

export function ListingImageCarousel({ images, altPrefix }: ListingImageCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const onSelect = useCallback(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  return (
    <div className="relative w-full">
      <Carousel className="w-full" opts={{ loop: true }} setApi={setApi}>
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={`${image.url}-${index}`}>
              <div className="overflow-hidden rounded-lg">
                <img
                  src={image.url}
                  alt={image.caption || `${altPrefix} image ${index + 1}`}
                  className="h-64 w-full object-cover sm:h-80"
                />
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
    </div>
  );
}
