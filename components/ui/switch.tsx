"use client";

import * as React from "react";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

// Off is a light track with a visible border; on is brand blue with a tick in the thumb, so the
// two states differ in colour and shape, not only in the thumb's position.
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group/switch peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-input bg-muted transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-primary data-checked:bg-primary dark:border-white/45 dark:bg-white/10",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none flex size-5 translate-x-px items-center justify-center rounded-full bg-background text-primary shadow-sm ring-1 ring-black/10 transition-transform data-checked:translate-x-[1.3125rem] dark:bg-[#c3cad6] dark:data-checked:bg-white"
      >
        <HugeiconsIcon
          icon={Tick02Icon}
          strokeWidth={2.5}
          className="size-3.5 opacity-0 transition-opacity group-data-[state=checked]/switch:opacity-100"
          aria-hidden="true"
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}

export { Switch };
