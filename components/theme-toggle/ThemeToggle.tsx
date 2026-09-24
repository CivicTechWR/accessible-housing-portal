"use client";

import { useEffect, useState } from "react";
import { ComputerIcon, Moon02Icon, SmartPhone01Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

const surfaceClasses = {
  // The blue site header and mobile menu.
  primary: {
    group: "bg-primary-foreground/15",
    item: "text-primary-foreground/70 hover:bg-primary-foreground/20 hover:text-primary-foreground data-[state=on]:bg-primary-foreground/25 data-[state=on]:text-primary-foreground focus-visible:border-transparent focus-visible:ring-primary-foreground/40",
  },
  // Popover menus such as the account menu.
  popover: {
    group: "bg-muted",
    item: "text-muted-foreground hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm dark:data-[state=on]:bg-input/50",
  },
};

type ThemeToggleProps = {
  /** The surface the toggle sits on, which sets its colours. */
  surface?: keyof typeof surfaceClasses;
};

export function ThemeToggle({ surface = "primary" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const { group: groupClass, item } = surfaceClasses[surface];
  const itemClass = cn("h-7 min-w-8 rounded-full px-2", item);

  // next-themes only knows the stored theme on the client, so render without a
  // selection until mounted to keep server and client markup identical.
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <ToggleGroup
      type="single"
      spacing={1}
      value={isMounted ? (theme ?? "system") : ""}
      onValueChange={(value) => {
        if (value) {
          setTheme(value);
        }
      }}
      aria-label="Colour theme"
      className={cn("rounded-full p-0.5", groupClass)}
    >
      <ToggleGroupItem
        value="light"
        title="Light theme"
        aria-label="Light theme"
        className={itemClass}
      >
        <HugeiconsIcon icon={Sun03Icon} strokeWidth={2} size={16} />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="dark"
        title="Dark theme"
        aria-label="Dark theme"
        className={itemClass}
      >
        <HugeiconsIcon icon={Moon02Icon} strokeWidth={2} size={16} />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="system"
        title="System theme"
        aria-label="System theme"
        className={itemClass}
      >
        <HugeiconsIcon
          icon={ComputerIcon}
          strokeWidth={2}
          size={16}
          className="pointer-coarse:hidden"
        />
        <HugeiconsIcon
          icon={SmartPhone01Icon}
          strokeWidth={2}
          size={16}
          className="hidden pointer-coarse:block"
        />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
