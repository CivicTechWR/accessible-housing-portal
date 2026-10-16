"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ToggleIconButtonProps extends React.ComponentPropsWithoutRef<typeof Button> {
  icon: React.ReactElement;
  isActive: boolean;
}

export function ToggleIconButton({ icon, isActive, className, ...props }: ToggleIconButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "rounded-full bg-background transition-colors duration-300 hover:bg-accent",
        isActive && "border-primary/30 bg-primary/10 hover:bg-primary/20",
        className,
      )}
      {...props}
    >
      {icon}
    </Button>
  );
}
