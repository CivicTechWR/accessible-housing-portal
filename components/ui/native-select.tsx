import * as React from "react";

import { cn } from "@/lib/utils";

function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-lg border border-input bg-background px-3 text-base shadow-xs outline-none dark:bg-input/10 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50 md:h-10 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
