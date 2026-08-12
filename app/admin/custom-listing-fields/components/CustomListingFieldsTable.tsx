"use client";

import type { DragEvent } from "react";
import { ArrowDown01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  AdminCustomListingField,
  UpdateCustomListingFieldInput,
} from "@/shared/schemas/custom-listing-fields";
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
  categoryOptions,
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
  onDeleteField,
  onTextChange,
  onApplicabilityChange,
  onVisibilityChange,
  onFilterableChange,
  onRequiredChange,
}: {
  categories: CategoryStat[];
  categoryOptions: string[];
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
  onDeleteField: (field: AdminCustomListingField) => void;
  onTextChange: (fieldId: string, payload: UpdateCustomListingFieldInput) => Promise<void>;
  onApplicabilityChange: (fieldId: string, appliesTo: AdminCustomListingField["appliesTo"]) => void;
  onVisibilityChange: (fieldId: string, publicOnly: boolean) => void;
  onFilterableChange: (fieldId: string, filterableOnly: boolean) => void;
  onRequiredChange: (fieldId: string, required: boolean) => void;
}) {
  return (
    <>
      <div className="mt-8 border-b border-border">
        <div className="flex gap-7 overflow-x-auto">
          <CategoryTab
            isActive={categoryFilter === "all"}
            label="All Fields"
            onClick={() => onCategoryFilterChange("all")}
          />
          {categories.map((category) => (
            <CategoryTab
              key={category.category}
              isActive={categoryFilter === category.category}
              label={category.label}
              count={category.count}
              onClick={() => onCategoryFilterChange(category.category)}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative block w-full xl:w-80">
            <span className="sr-only">Search fields</span>
            <HugeiconsIcon
              icon={Search01Icon}
              strokeWidth={2}
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search fields..."
              className="h-10 rounded-md bg-background pl-11 text-sm"
            />
          </label>

          <FilterSelect
            ariaLabel="Filter by category"
            value={categoryFilter}
            onChange={onCategoryFilterChange}
          >
            <option value="all">Category: All</option>
            {categories.map((category) => (
              <option key={category.category} value={category.category}>
                Category: {category.label}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            ariaLabel="Filter by visibility"
            value={visibilityFilter}
            onChange={(value) => onVisibilityFilterChange(value as VisibilityFilter)}
          >
            <option value="all">Visibility: All</option>
            <option value="public">Visibility: Public</option>
            <option value="internal">Visibility: Internal</option>
          </FilterSelect>

          <button
            type="button"
            className="h-10 px-3 text-left text-sm font-medium text-foreground/80 hover:text-primary"
            onClick={onClearFilters}
          >
            Clear filters
          </button>
        </div>

        {selectedFieldCount > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
            <span className="text-sm font-medium text-foreground">
              {selectedFieldCount} {selectedFieldCount === 1 ? "field" : "fields"} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="bg-background"
                onClick={onClearSelection}
              >
                Clear selection
              </Button>
              <Button type="button" size="lg" onClick={onOpenBulkEdit}>
                Bulk Edit
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-border bg-background">
        <div className="overflow-x-auto">
          <div
            className={cn(
              "grid border-b border-border bg-muted/50",
              TABLE_MIN_WIDTH,
              TABLE_COLUMNS,
            )}
          >
            <div />
            <div className="py-4 pr-3 text-xs font-medium text-foreground/80">Order</div>
            <SortHeader
              label="Label"
              sortKey="label"
              helperText={FIELD_HELP_TEXT.label}
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortHeader
              label="Key"
              sortKey="key"
              helperText={FIELD_HELP_TEXT.key}
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortHeader
              label="Category"
              sortKey="category"
              helperText={FIELD_HELP_TEXT.category}
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortHeader
              label="Applies To"
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
            <SortHeader
              label="Help Text"
              sortKey="helpText"
              helperText={FIELD_HELP_TEXT.helpText}
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortHeader
              label="Visibility"
              sortKey="visibility"
              helperText={FIELD_HELP_TEXT.visibility}
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortHeader
              label="Filterable"
              sortKey="filterable"
              helperText={FIELD_HELP_TEXT.filterable}
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            <SortHeader
              label="Required"
              sortKey="required"
              helperText={FIELD_HELP_TEXT.required}
              activeSortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
            <div className="px-4 py-4 text-xs font-medium text-foreground/80">Actions</div>
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
                    <div className="flex h-10 items-center gap-3 border-y border-border bg-muted/20 pl-[84px] pr-4">
                      <span className="text-xs font-semibold uppercase tracking-wide text-foreground/80">
                        {group.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
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
                          categoryOptions={categoryOptions}
                          onSelectToggle={(event) => onRowSelectToggle(field.id, event.shiftKey)}
                          onDragStart={(event, rowElement) =>
                            onRowDragStart(event, field, rowElement)
                          }
                          onDragEnd={onRowDragEnd}
                          onDragOver={(event) => onRowDragOver(event, field)}
                          onDrop={(event) => onRowDrop(event, field)}
                          onDelete={() => onDeleteField(field)}
                          onTextChange={(payload) => onTextChange(field.id, payload)}
                          onApplicabilityChange={(appliesTo) =>
                            onApplicabilityChange(field.id, appliesTo)
                          }
                          onVisibilityChange={(publicOnly) =>
                            onVisibilityChange(field.id, publicOnly)
                          }
                          onFilterableChange={(filterableOnly) =>
                            onFilterableChange(field.id, filterableOnly)
                          }
                          onRequiredChange={(required) => onRequiredChange(field.id, required)}
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
                        className="flex h-9 w-full items-center justify-center gap-2 border-b border-border text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
                        onClick={() => onExpandCategory(group.category)}
                      >
                        Show more in this category ({group.hiddenCount} more)
                        <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="size-4" />
                      </button>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
