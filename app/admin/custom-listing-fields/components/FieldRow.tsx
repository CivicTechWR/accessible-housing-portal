"use client";

import { type DragEvent, type KeyboardEvent, type MouseEvent, useRef, useState } from "react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Delete02Icon,
  DragDropVerticalIcon,
  EyeIcon,
  Tick02Icon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCustomListingFieldCategoryLabel } from "@/lib/custom-listing-fields/custom-listing-field-ordering";
import { cn } from "@/lib/utils";
import type {
  AdminCustomListingField,
  UpdateCustomListingFieldInput,
} from "@/shared/schemas/custom-listing-fields";
import {
  TABLE_COLUMNS,
  type SortDirection,
  type SortKey,
  nullableTrim,
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
      className="flex items-center gap-1 px-4 py-3 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
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
  position,
  isPending,
  isSelected,
  onSelectToggle,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onDelete,
  onTextChange,
  onApplicabilityChange,
  onVisibilityChange,
  onFilterableChange,
  onRequiredChange,
}: {
  field: AdminCustomListingField;
  /** The field's place within its category, counting from 1. */
  position: number;
  isPending: boolean;
  isSelected: boolean;
  onSelectToggle: (event: MouseEvent<HTMLButtonElement>) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>, rowElement: HTMLDivElement | null) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDelete: () => void;
  onTextChange: (payload: UpdateCustomListingFieldInput) => Promise<void>;
  onApplicabilityChange: (appliesTo: AdminCustomListingField["appliesTo"]) => void;
  onVisibilityChange: (publicOnly: boolean) => void;
  onFilterableChange: (filterableOnly: boolean) => void;
  onRequiredChange: (required: boolean) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={rowRef}
      className={cn(
        "grid min-h-16 items-start border-b border-border text-sm transition-colors last:border-b-0 hover:bg-muted/20",
        TABLE_COLUMNS,
        isSelected && "bg-primary/5",
        isPending && "opacity-60",
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex justify-end pt-3 pr-1">
        <button
          type="button"
          draggable={!isPending}
          className={cn(
            "flex size-7 cursor-grab items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors active:cursor-grabbing",
            "hover:border-border hover:bg-muted hover:text-foreground",
            isSelected && "border-primary/30 bg-primary/10 text-primary-text",
          )}
          aria-label={`Select or drag ${field.label} to reorder`}
          aria-pressed={isSelected}
          title={`Drag ${field.label} to reorder within ${formatCustomListingFieldCategoryLabel(
            field.category,
          )}, or click to select`}
          disabled={isPending}
          onClick={onSelectToggle}
          onDragStart={(event) => onDragStart(event, rowRef.current)}
          onDragEnd={onDragEnd}
        >
          <HugeiconsIcon
            icon={isSelected ? Tick02Icon : DragDropVerticalIcon}
            strokeWidth={2}
            className="size-4"
          />
        </button>
      </div>
      <div className="py-3 pr-3 text-sm tabular-nums text-muted-foreground">{position}</div>
      <div className="flex min-w-0 flex-col">
        <EditableTextCell
          value={field.label}
          className="pb-0.5 font-medium text-foreground"
          disabled={isPending}
          required
          ariaLabel={`Edit label for ${field.label}`}
          onCommit={(label) => onTextChange({ label })}
        />
        <p
          className="cursor-default truncate px-4 pb-3 font-mono text-xs text-muted-foreground"
          title={`${field.key} (field keys are fixed after creation)`}
        >
          {field.key}
        </p>
      </div>
      <div className="px-4 py-3">
        <Select
          value={field.appliesTo}
          onValueChange={(value) =>
            onApplicabilityChange(value as AdminCustomListingField["appliesTo"])
          }
          disabled={isPending}
        >
          <SelectTrigger
            size="sm"
            aria-label={`Edit applicability for ${field.label}`}
            title="Changing applicability affects future duplications; existing duplicated listings are unaffected."
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="building">Building</SelectItem>
            <SelectItem value="unit">Unit</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 py-1.5">
        <EditableTextCell
          label="Description"
          value={field.description ?? ""}
          displayValue={field.description || "No description"}
          className={cn("py-1", field.description ? "text-foreground" : "text-muted-foreground")}
          disabled={isPending}
          ariaLabel={`Edit description for ${field.label}`}
          multiline
          onCommit={(description) => onTextChange({ description: nullableTrim(description) })}
        />
        <EditableTextCell
          label="Help text"
          value={field.helpText ?? ""}
          displayValue={field.helpText || "No help text"}
          className="py-1 text-muted-foreground"
          disabled={isPending}
          ariaLabel={`Edit help text for ${field.label}`}
          multiline
          onCommit={(helpText) => onTextChange({ helpText: nullableTrim(helpText) })}
        />
      </div>
      <div className="px-3 py-3">
        <Select
          value={field.publicOnly ? "public" : "internal"}
          onValueChange={(value) => onVisibilityChange(value === "public")}
          disabled={isPending}
        >
          <SelectTrigger size="sm" aria-label={`Visibility for ${field.label}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="public">
              <HugeiconsIcon icon={EyeIcon} strokeWidth={2} className="size-4" aria-hidden />
              Public
            </SelectItem>
            <SelectItem value="internal">
              <HugeiconsIcon
                icon={ViewOffSlashIcon}
                strokeWidth={2}
                className="size-4 text-muted-foreground"
                aria-hidden
              />
              Internal
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="px-4 pt-4 pb-3">
        <Checkbox
          aria-label={`Toggle filterable for ${field.label}`}
          checked={field.filterableOnly}
          disabled={isPending}
          onCheckedChange={(checked) => onFilterableChange(checked === true)}
        />
      </div>
      <div className="px-4 pt-4 pb-3">
        <Checkbox
          aria-label={`Toggle required for ${field.label}`}
          checked={field.required}
          disabled={isPending}
          onCheckedChange={(checked) => onRequiredChange(checked === true)}
        />
      </div>
      <div className="flex items-center justify-center py-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Delete ${field.label}`}
          title={`Delete ${field.label}`}
          disabled={isPending}
          onClick={onDelete}
        >
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function EditableTextCell({
  label,
  value,
  displayValue,
  className,
  disabled,
  required,
  multiline,
  ariaLabel,
  onCommit,
}: {
  /** A small caption above the value, for cells that stack several fields. */
  label?: string;
  value: string;
  displayValue?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  multiline?: boolean;
  ariaLabel: string;
  onCommit: (value: string) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState("");
  const shownValue = displayValue ?? value;

  const beginEditing = () => {
    if (disabled) {
      return;
    }

    setDraft(value);
    setError("");
    setIsEditing(true);
  };

  const commit = async (nextValue = draft) => {
    const trimmed = nextValue.trim();

    if (required && !trimmed) {
      setError("Required");
      return;
    }

    if (trimmed === value.trim()) {
      setIsEditing(false);
      return;
    }

    try {
      await onCommit(required ? trimmed : nextValue);
      setIsEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save.");
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setDraft(value);
      setError("");
      setIsEditing(false);
      return;
    }

    if (event.key === "Enter" && !multiline) {
      event.preventDefault();
      void commit();
    }
  };

  if (isEditing) {
    return (
      <div className="px-3 py-2">
        {label ? (
          <span className="mb-1 block px-1 text-xs font-medium text-muted-foreground">{label}</span>
        ) : null}
        {multiline ? (
          <Textarea
            aria-label={ariaLabel}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void commit()}
            onKeyDown={handleKeyDown}
            autoFocus
            rows={3}
            className="min-h-20 bg-background text-sm"
          />
        ) : (
          <Input
            aria-label={ariaLabel}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => void commit()}
            onKeyDown={handleKeyDown}
            autoFocus
            className="bg-background text-sm"
          />
        )}
        {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "w-full cursor-text rounded-md px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        className,
      )}
      disabled={disabled}
      onClick={beginEditing}
    >
      {label ? (
        <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      ) : null}
      <span className="line-clamp-2" title={shownValue}>
        {shownValue}
      </span>
    </button>
  );
}
