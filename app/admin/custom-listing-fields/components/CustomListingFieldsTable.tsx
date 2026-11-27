"use client";

import type { DragEvent } from "react";
import { ArrowDown01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toSentenceCase } from "@/lib/listing-format";
import { cn } from "@/lib/utils";
import type { AdminCustomListingField } from "@/shared/schemas/custom-listing-fields";
import {
  FIELD_HELP_TEXT,
  TABLE_COLUMNS,
  TABLE_MIN_WIDTH,
  type DisplayGroup,
  type DropIndicator,
  type SortDirection,
  type SortKey,
  type VisibilityFilter,
} from "../custom-listing-fields-dashboard-utils";
import { CategoryTab, DropIndicatorLine, FieldRow, FilterSelect, SortHeader } from "./FieldRow";

type CategoryStat = {
  category: string;
  label: string;
  count: number;
};

export function CustomListingFieldsTable({
  categories,
  categoryFilter,
  visibilityFilter,
  search,
  sortKey,
  sortDirection,
  selectedFieldIds,
  selectedFieldCount,
  displayGroups,
  dropIndicator,
  pendingFieldId,
  onSearchChange,
  onCategoryFilterChange,
  onVisibilityFilterChange,
  onClearFilters,
  onClearSelection,
  onOpenBulkEdit,
  onSort,
  onExpandCategory,
  onRowSelectToggle,
  onRowDragStart,
  onRowDragEnd,
  onRowDragOver,
  onRowDrop,
  onEditField,
  onDeleteField,
}: {
  categories: CategoryStat[];
  categoryFilter: string;
  visibilityFilter: VisibilityFilter;
  search: string;
  sortKey: SortKey;
  sortDirection: SortDirection;
  selectedFieldIds: Set<string>;
  selectedFieldCount: number;
  displayGroups: DisplayGroup[];
  dropIndicator: DropIndicator | null;
  pendingFieldId: string | null;
  onSearchChange: (search: string) => void;
  onCategoryFilterChange: (category: string) => void;
  onVisibilityFilterChange: (visibility: VisibilityFilter) => void;
  onClearFilters: () => void;
  onClearSelection: () => void;
  onOpenBulkEdit: () => void;
  onSort: (sortKey: SortKey) => void;
  onExpandCategory: (category: string) => void;
  onRowSelectToggle: (fieldId: string, shiftKey: boolean) => void;
  onRowDragStart: (
    event: DragEvent<HTMLButtonElement>,
    field: AdminCustomListingField,
    rowElement: HTMLDivElement | null,
  ) => void;
  onRowDragEnd: () => void;
  onRowDragOver: (event: DragEvent<HTMLDivElement>, field: AdminCustomListingField) => void;
  onRowDrop: (event: DragEvent<HTMLDivElement>, field: AdminCustomListingField) => void;
  onEditField: (field: AdminCustomListingField) => void;
  onDeleteField: (field: AdminCustomListingField) => void;
}) {
  const hasFilters = search !== "" || categoryFilter !== "all" || visibilityFilter !== "all";

  return (
    <div className="space-y-4">
      {/* Wraps onto a second line rather than hiding chips past the edge. Phones get a select. */}
      <div role="group" aria-label="Category" className="hidden flex-wrap gap-2 md:flex">
        <CategoryTab
          isActive={categoryFilter === "all"}
          label="All fields"
          onClick={() => onCategoryFilterChange("all")}
        />
        {categories.map((category) => (
          <CategoryTab
            key={category.category}
            isActive={categoryFilter === category.category}
            label={toSentenceCase(category.label)}
            count={category.count}
            onClick={() => onCategoryFilterChange(category.category)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative block w-full md:w-72">
            <span className="sr-only">Search fields</span>
            <HugeiconsIcon
              icon={Search01Icon}
              strokeWidth={2}
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search fields"
              className="pl-9"
            />
          </label>

          <div className="grid grid-cols-2 gap-3 md:flex">
            {/* The category chips pick a category on wider screens. */}
            <FilterSelect
              ariaLabel="Filter by category"
              className="md:hidden"
              value={categoryFilter}
              onChange={onCategoryFilterChange}
              options={[
                { value: "all", label: "All categories" },
                ...categories.map((category) => ({
                  value: category.category,
                  label: `${toSentenceCase(category.label)} (${category.count})`,
                })),
              ]}
            />

            <FilterSelect
              ariaLabel="Filter by visibility"
              value={visibilityFilter}
              onChange={(value) => onVisibilityFilterChange(value as VisibilityFilter)}
              options={[
                { value: "all", label: "Any visibility" },
                { value: "public", label: "Public" },
                { value: "internal", label: "Internal" },
              ]}
            />
          </div>

          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              className="self-start md:self-auto"
              onClick={onClearFilters}
            >
              Clear filters
            </Button>
          ) : null}
        </div>

        {selectedFieldCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <span className="mr-1 text-sm font-medium text-foreground" role="status">
              {selectedFieldCount} {selectedFieldCount === 1 ? "field" : "fields"} selected
            </span>
            <Button type="button" variant="ghost" onClick={onClearSelection}>
              Clear selection
            </Button>
            <Button type="button" variant="outline" onClick={onOpenBulkEdit}>
              Bulk edit
            </Button>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl bg-card shadow-xs ring-1 ring-foreground/10">
        <div className="overflow-x-auto">
          <div
            className={cn(
              "grid border-b border-border bg-muted/50",
              TABLE_MIN_WIDTH,
              TABLE_COLUMNS,
            )}
          >
            <div>
              <span className="sr-only">Reorder</span>
            </div>
            <SortHeader
              label="Field"
              sortKey="label"
              helperText={FIELD_HELP_TEXT.label}
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortHeader
              label="Applies to"
              sortKey="appliesTo"
              helperText={FIELD_HELP_TEXT.appliesTo}
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortHeader
              label="Description"
              sortKey="description"
              helperText={FIELD_HELP_TEXT.description}
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            <div>
              <span className="sr-only">Actions</span>
            </div>
          </div>

          <div className={TABLE_MIN_WIDTH}>
            {displayGroups.length === 0 ? (
              <div className="px-8 py-14 text-center text-muted-foreground">
                No custom fields match these filters.
              </div>
            ) : (
              displayGroups.map((group) => {
                return (
                  <div key={group.category}>
                    <div className="flex h-10 items-center gap-2 border-b border-border bg-muted/30 px-4">
                      <h2 className="text-sm font-semibold text-foreground">
                        {toSentenceCase(group.label)}
                      </h2>
                      <span className="text-sm text-muted-foreground">
                        {group.fields.length} {group.fields.length === 1 ? "field" : "fields"}
                      </span>
                    </div>
                    {group.visibleFields.map((field, index) => (
                      <div key={field.id}>
                        {dropIndicator?.category === group.category &&
                        dropIndicator.insertionIndex === index ? (
                          <DropIndicatorLine />
                        ) : null}
                        <FieldRow
                          field={field}
                          isPending={pendingFieldId === field.id}
                          isSelected={selectedFieldIds.has(field.id)}
                          onSelectToggle={(event) => onRowSelectToggle(field.id, event.shiftKey)}
                          onDragStart={(event, rowElement) =>
                            onRowDragStart(event, field, rowElement)
                          }
                          onDragEnd={onRowDragEnd}
                          onDragOver={(event) => onRowDragOver(event, field)}
                          onDrop={(event) => onRowDrop(event, field)}
                          onEdit={() => onEditField(field)}
                          onDelete={() => onDeleteField(field)}
                        />
                      </div>
                    ))}
                    {dropIndicator?.category === group.category &&
                    dropIndicator.insertionIndex === group.visibleFields.length ? (
                      <DropIndicatorLine />
                    ) : null}
                    {group.hiddenCount > 0 ? (
                      <button
                        type="button"
                        // pl-15 lines the text up with the Field column: the 48px handle
                        // column plus the cells' 12px padding.
                        className="flex h-10 w-full items-center gap-2 border-b border-border pl-15 text-sm font-medium text-primary-text transition-colors hover:bg-muted/30"
                        onClick={() => onExpandCategory(group.category)}
                      >
                        Show more in this category ({group.hiddenCount} more)
                        <HugeiconsIcon
                          icon={ArrowDown01Icon}
                          strokeWidth={2}
                          className="size-4"
                          aria-hidden
                        />
                      </button>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
