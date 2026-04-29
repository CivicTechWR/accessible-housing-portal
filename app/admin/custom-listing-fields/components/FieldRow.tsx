"use client";

import {
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";
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

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  AdminCustomListingField,
  UpdateCustomListingFieldInput,
} from "@/shared/schemas/custom-listing-fields";
import {
  TABLE_COLUMNS,
  type SortDirection,
  type SortKey,
  formatCategoryLabel,
  getCanonicalCategoryValue,
  nullableTrim,
} from "../custom-listing-fields-dashboard-utils";
import { CategoryCombobox } from "./CategoryCombobox";

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
      className={cn(
        "flex h-11 shrink-0 items-center gap-2 border-b-2 px-5 text-sm font-medium transition-colors",
        isActive
          ? "border-primary text-primary"
          : "border-transparent text-foreground/75 hover:text-foreground",
      )}
      onClick={onClick}
    >
      {label}
      {count !== undefined ? (
        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function FilterSelect({
  ariaLabel,
  children,
  value,
  onChange,
}: {
  ariaLabel: string;
  children: ReactNode;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 min-w-36 rounded-md border border-input bg-background px-4 text-sm text-foreground shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
    >
      {children}
    </select>
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
      className="flex items-center gap-1 px-4 py-4 text-left text-xs font-medium text-foreground/80"
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive ? (
        <HugeiconsIcon
          icon={direction === "asc" ? ArrowUp01Icon : ArrowDown01Icon}
          strokeWidth={2}
          className="size-3 text-primary"
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
  categoryOptions,
  onSelectToggle,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onDelete,
  onTextChange,
  onVisibilityChange,
  onFilterableChange,
  onRequiredChange,
}: {
  field: AdminCustomListingField;
  isPending: boolean;
  isSelected: boolean;
  categoryOptions: string[];
  onSelectToggle: (event: MouseEvent<HTMLButtonElement>) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>, rowElement: HTMLDivElement | null) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDelete: () => void;
  onTextChange: (payload: UpdateCustomListingFieldInput) => Promise<void>;
  onVisibilityChange: (publicOnly: boolean) => void;
  onFilterableChange: (filterableOnly: boolean) => void;
  onRequiredChange: (required: boolean) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const visibilityIcon = field.publicOnly ? EyeIcon : ViewOffSlashIcon;
  const visibilityToneClass = field.publicOnly ? "text-emerald-700" : "text-muted-foreground";

  return (
    <div
      ref={rowRef}
      className={cn(
        "grid min-h-16 items-center border-b border-border text-sm transition-colors last:border-b-0",
        TABLE_COLUMNS,
        isSelected && "bg-primary/5",
        isPending && "opacity-60",
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex justify-end pr-1">
        <button
          type="button"
          draggable={!isPending}
          className={cn(
            "flex size-7 cursor-grab items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors active:cursor-grabbing",
            "hover:border-border hover:bg-muted hover:text-foreground",
            isSelected && "border-primary/30 bg-primary/10 text-primary",
          )}
          aria-label={`Select or drag ${field.label} to reorder`}
          aria-pressed={isSelected}
          title={`Drag ${field.label} to reorder within ${formatCategoryLabel(
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
      <div className="py-3 pr-3 font-mono text-xs tabular-nums text-muted-foreground">
        {field.sortOrder}
      </div>
      <EditableTextCell
        value={field.label}
        className="font-medium text-foreground"
        disabled={isPending}
        required
        ariaLabel={`Edit label for ${field.label}`}
        onCommit={(label) => onTextChange({ label })}
      />
      <div
        className="cursor-not-allowed px-4 py-3 font-mono text-xs text-muted-foreground"
        title="Field keys are fixed after creation."
      >
        {field.key}
      </div>
      <EditableTextCell
        value={formatCategoryLabel(field.category)}
        displayValue={formatCategoryLabel(field.category)}
        className="text-foreground/80"
        disabled={isPending}
        required
        ariaLabel={`Edit category for ${field.label}`}
        datalistId={`field-category-options-${field.id}`}
        datalistOptions={categoryOptions}
        onCommit={(category) =>
          onTextChange({ category: getCanonicalCategoryValue(category, categoryOptions) })
        }
      />
      <EditableTextCell
        value={field.description ?? ""}
        displayValue={field.description || "No description."}
        className="text-foreground/90"
        disabled={isPending}
        ariaLabel={`Edit description for ${field.label}`}
        multiline
        onCommit={(description) => onTextChange({ description: nullableTrim(description) })}
      />
      <EditableTextCell
        value={field.helpText ?? ""}
        displayValue={field.helpText || "No help text."}
        className="text-foreground/90"
        disabled={isPending}
        ariaLabel={`Edit help text for ${field.label}`}
        multiline
        onCommit={(helpText) => onTextChange({ helpText: nullableTrim(helpText) })}
      />
      <div className="px-4 py-3">
        <label className="relative inline-flex">
          <span className="sr-only">Visibility for {field.label}</span>
          <HugeiconsIcon
            icon={visibilityIcon}
            strokeWidth={2}
            className={cn(
              "pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2",
              visibilityToneClass,
            )}
          />
          <select
            value={field.publicOnly ? "public" : "internal"}
            onChange={(event) => onVisibilityChange(event.target.value === "public")}
            disabled={isPending}
            className={cn(
              "h-8 w-28 rounded-md border border-input bg-background py-1 pl-8 pr-2 text-xs font-medium outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60",
              visibilityToneClass,
            )}
          >
            <option value="public">Public</option>
            <option value="internal">Internal</option>
          </select>
        </label>
      </div>
      <div className="px-4 py-3">
        <Checkbox
          aria-label={`Toggle filterable for ${field.label}`}
          checked={field.filterableOnly}
          disabled={isPending}
          onCheckedChange={(checked) => onFilterableChange(checked === true)}
        />
      </div>
      <div className="px-4 py-3">
        <Checkbox
          aria-label={`Toggle required for ${field.label}`}
          checked={field.required}
          disabled={isPending}
          onCheckedChange={(checked) => onRequiredChange(checked === true)}
        />
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          className="text-destructive transition-colors hover:text-destructive/80 disabled:opacity-50"
          aria-label={`Delete ${field.label}`}
          disabled={isPending}
          onClick={onDelete}
        >
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-4" />
        </button>
      </div>
    </div>
  );
}

function EditableTextCell({
  value,
  displayValue,
  className,
  disabled,
  required,
  multiline,
  ariaLabel,
  datalistId,
  datalistOptions,
  onCommit,
}: {
  value: string;
  displayValue?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  multiline?: boolean;
  ariaLabel: string;
  datalistId?: string;
  datalistOptions?: string[];
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
        ) : datalistId && datalistOptions ? (
          <CategoryCombobox
            id={datalistId}
            value={draft}
            options={datalistOptions}
            onValueChange={setDraft}
            onValueCommit={(nextValue) => void commit(nextValue)}
            onBlur={() => void commit()}
            onKeyDown={handleKeyDown}
            required={required}
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
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "h-full w-full cursor-text px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
        className,
      )}
      disabled={disabled}
      onClick={beginEditing}
    >
      {shownValue}
    </button>
  );
}
