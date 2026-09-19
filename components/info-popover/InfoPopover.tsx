"use client";

import { useEffect, useId, useRef, useState } from "react";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function InfoPopover({ label, description }: { label: string; description: string }) {
  const [open, setOpen] = useState(false);
  const pinned = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const descriptionId = useId();

  function cancelClose() {
    clearTimeout(closeTimer.current);
  }

  function show() {
    cancelClose();
    setOpen(true);
  }

  function scheduleClose() {
    cancelClose();
    // Allow the pointer to cross the gap between the icon and the popover.
    closeTimer.current = setTimeout(() => {
      if (!pinned.current) setOpen(false);
    }, 150);
  }

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        cancelClose();
        pinned.current = false;
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 rounded-full text-muted-foreground"
          aria-label={label}
          aria-describedby={open ? descriptionId : undefined}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") show();
          }}
          onPointerLeave={scheduleClose}
          onFocus={show}
          onBlur={scheduleClose}
          onClick={(event) => {
            event.preventDefault();
            cancelClose();
            pinned.current = !pinned.current;
            setOpen(pinned.current);
          }}
        >
          <HugeiconsIcon icon={InformationCircleIcon} className="size-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        aria-label={label}
        aria-describedby={descriptionId}
        className="max-w-[calc(100vw-2rem)] text-sm normal-case tracking-normal font-normal"
        collisionPadding={16}
        onPointerEnter={cancelClose}
        onPointerLeave={scheduleClose}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <p id={descriptionId}>{description}</p>
      </PopoverContent>
    </Popover>
  );
}
