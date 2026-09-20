import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AuthCardProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function AuthCard({ title, description, children, footer, className }: AuthCardProps) {
  return (
    <Card
      className={cn("w-full max-w-md border border-border/80 shadow-xl shadow-black/5", className)}
    >
      <CardHeader className="border-b border-border/60">
        <CardTitle>
          <h1>{title}</h1>
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4 pt-4">{children}</CardContent>
      {footer ? <CardFooter className="border-t border-border/60 pt-4">{footer}</CardFooter> : null}
    </Card>
  );
}
