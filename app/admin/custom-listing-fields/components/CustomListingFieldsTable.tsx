"use client";

import { useId, useState, type DragEvent } from "react";
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
import { DropIndicatorLine, FieldRow, FilterSelect, SortHeader } from "./FieldRow";

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
  const groupIdPrefix = useId();
  // Categories the admin has folded away. Every group starts open.
  const [collapsedCategories, setCollapsedCategories] = useState<ReadonlySet<string>>(new Set());
  const toggleCategory = (category: string) =>
    setCollapsedCategories((current) => {
      const next = new Set(current);
      if (!next.delete(category)) next.add(category);
      return next;
    });

  return (
    // The search and filters sit in the card's header, as on the Users page.
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative block w-full md:flex-1">
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
            <FilterSelect
              ariaLabel="Filter by category"
              className="md:w-52"
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
          <div className="flex flex-wrap items-center gap-2">
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

      <div className="overflow-x-auto">
        <div className={cn("grid border-b border-border bg-muted", TABLE_MIN_WIDTH, TABLE_COLUMNS)}>
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
            displayGroups.map((group, groupIndex) => {
              const isOpen = !collapsedCategories.has(group.category);
              const rowsId = `${groupIdPrefix}-group-${groupIndex}`;
              return (
                <div key={group.category}>
                  {/* A heading row between rules, rather than a shaded band, so each group reads
                        as a section of one list. Every group, the first included, gets the same
                        space above; the first needs no top rule. The heading folds the group away
                        so a long list can be scanned. */}
                  <h2 className="border-b border-border px-2 py-1.5 [:not(:first-child)>&]:border-t">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={rowsId}
                      onClick={() => toggleCategory(group.category)}
                      className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <HugeiconsIcon
                        icon={ArrowDown01Icon}
                        strokeWidth={2}
                        className={cn(
                          "size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
                          !isOpen && "-rotate-90",
                        )}
                        aria-hidden
                      />
                      <span className="text-[15px] font-bold text-foreground">
                        {toSentenceCase(group.label)}
                      </span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {group.fields.length} {group.fields.length === 1 ? "field" : "fields"}
                      </span>
                    </button>
                  </h2>
                  <div id={rowsId} hidden={!isOpen}>
                    {group.fields.map((field, index) => (
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
                    dropIndicator.insertionIndex === group.fields.length ? (
                      <DropIndicatorLine />
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
