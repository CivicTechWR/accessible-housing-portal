"use client";

import { type DragEvent, type MouseEvent, useRef } from "react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  AsteriskIcon,
  Delete02Icon,
  DragDropVerticalIcon,
  EyeIcon,
  FilterIcon,
  FilterRemoveIcon,
  MoreHorizontalIcon,
  PencilEdit02Icon,
  Tick02Icon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

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
        "flex h-11 shrink-0 items-center gap-2 border-b-2 px-1 text-sm font-medium whitespace-nowrap transition-colors",
        isActive
          ? "border-primary-text text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
    >
      {label}
      {count !== undefined ? (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
            isActive ? "bg-primary/10 text-primary-text" : "bg-muted text-muted-foreground",
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
        "grid min-h-16 cursor-pointer items-start border-b border-border text-sm transition-colors last:border-b-0 hover:bg-muted/40",
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
      <div className="flex justify-center pt-3.5">
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
          title={`Drag to reorder within ${toSentenceCase(
            formatCustomListingFieldCategoryLabel(field.category),
          )}, or click to select`}
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
      </div>
      <div className="min-w-0 px-3 py-4">
        <button
          type="button"
          className="rounded-sm text-left font-medium text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          disabled={isPending}
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
        >
          <span className="sr-only">Edit </span>
          {label}
        </button>
      </div>
      <div className="px-3 py-4">
        <Badge variant="secondary" className="-my-0.5">
          {field.appliesTo === "building" ? "Building" : "Unit"}
        </Badge>
      </div>
      <div className="min-w-0 px-3 py-4">
        {field.description ? (
          <p className="line-clamp-2 text-foreground" title={field.description}>
            {field.description}
          </p>
        ) : (
          <p className="text-muted-foreground">No description</p>
        )}
      </div>
      <ul className="flex flex-col gap-1 px-3 py-4 text-sm">
        <StatusIndicator
          icon={field.publicOnly ? EyeIcon : ViewOffSlashIcon}
          label={field.publicOnly ? "Public" : "Internal"}
          muted={!field.publicOnly}
        />
        <StatusIndicator
          icon={field.filterableOnly ? FilterIcon : FilterRemoveIcon}
          label={field.filterableOnly ? "Filterable" : "Not filterable"}
          muted={!field.filterableOnly}
        />
        {field.required ? <StatusIndicator icon={AsteriskIcon} label="Required" /> : null}
      </ul>
      <div className="flex justify-center pt-3">
        {/* Not modal, so the delete dialog opened from it doesn't leave the page inert. */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              ref={menuButtonRef}
              type="button"
              variant="ghost"
              size="icon"
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

function StatusIndicator({
  icon,
  label,
  muted = false,
}: {
  icon: IconSvgElement;
  label: string;
  muted?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-1.5 whitespace-nowrap",
        muted ? "text-muted-foreground" : "text-foreground",
      )}
    >
      <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4 shrink-0" aria-hidden />
      {label}
    </li>
  );
}
