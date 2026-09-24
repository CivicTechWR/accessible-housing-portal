"use client";

import { type KeyboardEvent, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  formatCategoryLabel,
  getUniqueCategoryOptions,
  isSameCategoryOption,
  normalizeCategoryValue,
} from "../custom-listing-fields-dashboard-utils";

export function CategoryCombobox({
  id,
  value,
  options,
  disabled,
  required,
  onValueChange,
  onValueCommit,
  onBlur,
  onKeyDown,
}: {
  id: string;
  value: string;
  options: string[];
  disabled?: boolean;
  required?: boolean;
  onValueChange: (value: string) => void;
  onValueCommit?: (value: string) => void;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const query = value.trim().toLowerCase();
  const uniqueOptions = useMemo(() => {
    return getUniqueCategoryOptions(options);
  }, [options]);
  const matchingOptions = useMemo(() => {
    if (!query) {
      return uniqueOptions;
    }

    return uniqueOptions.filter((option) => {
      const label = formatCategoryLabel(option).toLowerCase();
      return option.toLowerCase().includes(query) || label.includes(query);
    });
  }, [query, uniqueOptions]);
  const exactMatch = uniqueOptions.some((option) => isSameCategoryOption(value, option));
  const customCategory = normalizeCategoryValue(value);

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          globalThis.setTimeout(() => setIsOpen(false), 120);
          onBlur?.();
        }}
        onKeyDown={onKeyDown}
        disabled={disabled}
        required={required}
        autoFocus={Boolean(onBlur)}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={`${id}-options`}
      />
      {isOpen && !disabled ? (
        <div
          id={`${id}-options`}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg"
          role="listbox"
        >
          {matchingOptions.map((option) => (
            <button
              key={option}
              type="button"
              className="flex w-full flex-col rounded-sm px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onValueChange(option);
                onValueCommit?.(option);
                setIsOpen(false);
              }}
              role="option"
              aria-selected={isSameCategoryOption(value, option)}
            >
              <span className="font-medium text-foreground">{formatCategoryLabel(option)}</span>
              <span className="text-xs text-muted-foreground">Existing category</span>
            </button>
          ))}

          {customCategory && !exactMatch ? (
            <button
              type="button"
              className="mt-1 flex w-full flex-col rounded-sm border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-left text-sm transition-colors hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onValueChange(customCategory);
                onValueCommit?.(customCategory);
                setIsOpen(false);
              }}
              role="option"
              aria-selected={false}
            >
              <span className="font-medium text-primary-text">
                Create new category "{customCategory}"
              </span>
              <span className="text-xs text-muted-foreground">
                Saving with this value will create it.
              </span>
            </button>
          ) : null}

          {!matchingOptions.length && !customCategory ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Type to search or create a category.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
