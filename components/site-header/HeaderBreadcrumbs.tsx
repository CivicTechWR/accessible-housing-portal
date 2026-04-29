"use client";

import { usePathname } from "next/navigation";

const uuidSegmentPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const segmentLabelMap: Record<string, string> = {
  admin: "Admin",
  invite: "Invite",
  listings: "Listings",
  preview: "Preview",
  "admin-invite": "Admin Invite",
  "sign-in": "Sign In",
  users: "Users",
};

export function HeaderBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbItems =
    segments.length > 0
      ? segments.map((segment) => {
          const knownLabel = segmentLabelMap[segment];

          if (uuidSegmentPattern.test(segment)) {
            return "Details";
          }

          if (knownLabel) {
            return knownLabel;
          }

          return segment
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");
        })
      : ["Home"];

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-primary-foreground/80">
        {breadcrumbItems.map((item, index) => (
          <li key={`${item}-${index}`} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">&gt;</span> : null}
            <span
              aria-current={index === breadcrumbItems.length - 1 ? "page" : undefined}
              className={
                index === breadcrumbItems.length - 1 ? "font-medium text-primary-foreground" : ""
              }
            >
              {item}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
