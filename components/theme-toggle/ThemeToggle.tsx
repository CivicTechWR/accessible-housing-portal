"use client";

import { useEffect, useState } from "react";
import { DarkModeIcon, Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

const surfaceClasses = {
  // The site header, mobile menu and popover menus such as the account menu.
  default: {
    group: "bg-muted",
    item: "text-muted-foreground hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm dark:data-[state=on]:bg-white/15 dark:data-[state=on]:ring-1 dark:data-[state=on]:ring-white/25",
  },
};

type ThemeToggleProps = {
  /** Shows "Light", "Dark" and "Auto" beside the icons, where there's room. */
  showLabels?: boolean;
  /** The surface the toggle sits on, which sets its colours. */
  surface?: keyof typeof surfaceClasses;
};

export function ThemeToggle({ surface = "default", showLabels = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const { group: groupClass, item } = surfaceClasses[surface];
  const itemClass = cn("h-8 min-w-9 gap-1.5 rounded-full px-2", showLabels && "px-3", item);

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
        {showLabels ? <span>Light</span> : null}
      </ToggleGroupItem>
      <ToggleGroupItem
        value="dark"
        title="Dark theme"
        aria-label="Dark theme"
        className={itemClass}
      >
        <HugeiconsIcon icon={Moon02Icon} strokeWidth={2} size={16} />
        {showLabels ? <span>Dark</span> : null}
      </ToggleGroupItem>
      <ToggleGroupItem
        value="system"
        title="Auto theme: match this device"
        aria-label="Auto theme: match this device"
        className={itemClass}
      >
        {/* A half-filled circle: follows the device's light or dark setting. */}
        <HugeiconsIcon icon={DarkModeIcon} strokeWidth={2} size={16} />
        {showLabels ? <span>Auto</span> : null}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
