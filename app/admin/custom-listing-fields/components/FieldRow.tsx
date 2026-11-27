"use client";

import { type DragEvent, type MouseEvent, useRef } from "react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Delete02Icon,
  DragDropVerticalIcon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCustomListingFieldCategoryLabel } from "@/lib/custom-listing-fields/custom-listing-field-ordering";
import { toSentenceCase } from "@/lib/listing-format";
import { cn } from "@/lib/utils";
import type { AdminCustomListingField } from "@/shared/schemas/custom-listing-fields";
import {
  TABLE_COLUMNS,
  type SortDirection,
  type SortKey,
} from "../custom-listing-fields-dashboard-utils";

export function CategoryTab({
  isActive,
  label,
  count,
  onClick,
}: {
  isActive: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      className={cn(
        "flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
        // The same tinted "selected" style as the rest of the app's chips.
        isActive
          ? "border-primary/30 bg-primary/10 text-primary-text dark:border-primary-text/30 dark:bg-primary-text/15"
          : "border-input bg-background text-foreground hover:bg-muted",
      )}
      onClick={onClick}
    >
      {label}
      {count !== undefined ? (
        <span
          className={cn(
            "text-sm font-normal tabular-nums",
            isActive ? "text-primary-text/80" : "text-muted-foreground",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function FilterSelect({
  ariaLabel,
  options,
  value,
  onChange,
  className,
}: {
  ariaLabel: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={ariaLabel} className={cn("md:w-44", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SortHeader({
  label,
  sortKey,
  helperText,
  activeSortKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  helperText: string;
  activeSortKey: SortKey;
  direction: SortDirection;
  onSort: (sortKey: SortKey) => void;
}) {
  const isActive = sortKey === activeSortKey;

  return (
    <button
      type="button"
      title={helperText}
      aria-label={`${label}: ${helperText}`}
      className="flex items-center gap-1 px-3 py-3 text-left text-xs font-semibold text-muted-foreground hover:text-foreground"
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive ? (
        <HugeiconsIcon
          icon={direction === "asc" ? ArrowUp01Icon : ArrowDown01Icon}
          strokeWidth={2}
          className="size-3.5 text-primary-text"
        />
      ) : null}
    </button>
  );
}

export function DropIndicatorLine() {
  return (
    <div className="relative h-0" aria-hidden>
      <div className="pointer-events-none absolute left-0 right-0 top-[-1px] z-10 flex items-center">
        <span className="size-2 rounded-full bg-primary" />
        <span className="h-0.5 flex-1 bg-primary shadow-[0_0_0_1px_var(--color-background)]" />
      </div>
    </div>
  );
}

export function FieldRow({
  field,
  isPending,
  isSelected,
  onSelectToggle,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onEdit,
  onDelete,
}: {
  field: AdminCustomListingField;
  isPending: boolean;
  isSelected: boolean;
  onSelectToggle: (event: MouseEvent<HTMLButtonElement>) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>, rowElement: HTMLDivElement | null) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const label = toSentenceCase(field.label);

  return (
    // The whole row opens the editor for pointer users; the name button is the keyboard and screen
    // reader entry point, so the row itself needs no role.
    <div
      ref={rowRef}
      className={cn(
        "grid min-h-13 cursor-pointer items-start border-b border-border text-sm transition-colors last:border-b-0 hover:bg-muted/40",
        TABLE_COLUMNS,
        isSelected && "bg-primary/5 hover:bg-primary/10",
        isPending && "pointer-events-none opacity-60",
      )}
      onClick={() => {
        if (!isPending) onEdit();
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex justify-center pt-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              draggable={!isPending}
              className={cn(
                "flex size-8 cursor-grab items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors active:cursor-grabbing",
                "hover:border-border hover:bg-background hover:text-foreground",
                isSelected && "border-primary/30 bg-primary/10 text-primary-text",
              )}
              aria-label={`Select or drag ${label} to reorder`}
              aria-pressed={isSelected}
              disabled={isPending}
              onClick={(event) => {
                event.stopPropagation();
                onSelectToggle(event);
              }}
              onDragStart={(event) => onDragStart(event, rowRef.current)}
              onDragEnd={onDragEnd}
            >
              <HugeiconsIcon
                icon={isSelected ? Tick02Icon : DragDropVerticalIcon}
                strokeWidth={2}
                className="size-4"
                aria-hidden
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            Drag to reorder within{" "}
            {toSentenceCase(formatCustomListingFieldCategoryLabel(field.category))}. Click to select
            rows for bulk edit.
          </TooltipContent>
        </Tooltip>
      </div>
      {/* The name, then only the exceptions: a field is public and filterable unless marked. */}
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-3 py-3.5">
        <button
          type="button"
          className="rounded-sm text-left font-semibold text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          disabled={isPending}
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
        >
          <span className="sr-only">Edit </span>
          {label}
        </button>
        {!field.publicOnly ? <ExceptionBadge>Internal</ExceptionBadge> : null}
        {!field.filterableOnly ? <ExceptionBadge>Not filterable</ExceptionBadge> : null}
        {field.required ? <ExceptionBadge>Required</ExceptionBadge> : null}
      </div>
      <div className="px-3 py-3.5">
        <Badge variant="secondary">{field.appliesTo === "building" ? "Building" : "Unit"}</Badge>
      </div>
      <div className="min-w-0 px-3 py-3.5">
        <p className="line-clamp-2 text-muted-foreground" title={field.description || undefined}>
          {field.description || "No description"}
        </p>
      </div>
      <div className="flex justify-center pt-2">
        {/* Not modal, so the delete dialog opened from it doesn't leave the page inert. */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              ref={menuButtonRef}
              type="button"
              variant="ghost"
              size="icon"
              className="max-sm:size-11"
              aria-label={`More actions for ${label}`}
              disabled={isPending}
              onClick={(event) => event.stopPropagation()}
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenuItem
              onSelect={() => {
                // Gives the sheet a live element to return focus to when it closes.
                menuButtonRef.current?.focus();
                onEdit();
              }}
            >
              <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} aria-hidden />
              Edit field
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                // The delete dialog returns focus to whatever had it when it opened, and the menu
                // item is about to unmount.
                menuButtonRef.current?.focus();
                onDelete();
              }}
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} aria-hidden />
              Delete field
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function ExceptionBadge({ children }: { children: string }) {
  return (
    <Badge variant="outline" className="font-normal text-muted-foreground">
      {children}
    </Badge>
  );
}
