"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type Control, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toSentenceCase } from "@/lib/listing-format";
import type {
  AdminCustomListingField,
  UpdateCustomListingFieldInput,
} from "@/shared/schemas/custom-listing-fields";
import {
  editFieldSheetSchema,
  getEditFieldSheetValues,
  toUpdateFieldPayload,
  type EditFieldSheetInput,
  type EditFieldSheetValues,
} from "../custom-listing-fields-dashboard-forms";
import {
  FIELD_HELP_TEXT,
  getUniqueCategoryOptions,
} from "../custom-listing-fields-dashboard-utils";
import { CategoryCombobox } from "./CategoryCombobox";

type SheetControl = Control<EditFieldSheetInput, unknown, EditFieldSheetValues>;

/** Every editable setting for one field, opened from its row. */
export function FieldEditSheet({
  field,
  categories,
  isSaving,
  onClose,
  onSave,
}: {
  field: AdminCustomListingField;
  categories: string[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (payload: UpdateCustomListingFieldInput) => Promise<void>;
}) {
  const form = useForm<EditFieldSheetInput, unknown, EditFieldSheetValues>({
    resolver: zodResolver(editFieldSheetSchema),
    defaultValues: getEditFieldSheetValues(field),
  });
  const { isDirty } = form.formState;

  const handleSubmit = async (values: EditFieldSheetValues) => {
    try {
      await onSave(toUpdateFieldPayload(values, categories));
    } catch (caught) {
      form.setError("root", {
        message: caught instanceof Error ? caught.message : "Unable to save custom field.",
      });
    }
  };

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !isSaving) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
        // A stray click outside shouldn't throw away edits; Cancel and Escape still close.
        onInteractOutside={(event) => {
          if (isDirty || isSaving) event.preventDefault();
        }}
      >
        <Form {...form}>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit(handleSubmit)}
            noValidate
          >
            <SheetHeader className="gap-1 border-b border-border pr-14">
              <SheetTitle className="text-lg font-bold">{toSentenceCase(field.label)}</SheetTitle>
              <SheetDescription>
                Edit how this field appears on listings and filters.
              </SheetDescription>
            </SheetHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
              <FormField
                control={form.control}
                name="label"
                render={({ field: input }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Label</FormLabel>
                    <FormDescription>{FIELD_HELP_TEXT.label}</FormDescription>
                    <FormControl>
                      <Input {...input} disabled={isSaving} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Key</p>
                <p className="text-sm text-muted-foreground">
                  {FIELD_HELP_TEXT.key} It can't change after the field is created.
                </p>
                <p className="rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-sm break-all text-foreground">
                  {field.key}
                </p>
              </div>

              <FormField
                control={form.control}
                name="category"
                render={({ field: input }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel htmlFor="edit-field-category">Category</FormLabel>
                    <FormDescription>{FIELD_HELP_TEXT.category}</FormDescription>
                    <CategoryCombobox
                      id="edit-field-category"
                      value={input.value}
                      options={getUniqueCategoryOptions(categories)}
                      onValueChange={input.onChange}
                      disabled={isSaving}
                      required
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appliesTo"
                render={({ field: input }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Applies to</FormLabel>
                    <FormDescription>
                      {FIELD_HELP_TEXT.appliesTo} Changing it affects future duplicates only.
                    </FormDescription>
                    <Select value={input.value} onValueChange={input.onChange} disabled={isSaving}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper">
                        <SelectItem value="building">Building, shared across units</SelectItem>
                        <SelectItem value="unit">Unit, specific to one unit</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SheetTextArea
                control={form.control}
                name="description"
                label="Description"
                helpText={FIELD_HELP_TEXT.description}
                disabled={isSaving}
              />
              <SheetTextArea
                control={form.control}
                name="helpText"
                label="Partner help text"
                helpText={FIELD_HELP_TEXT.helpText}
                disabled={isSaving}
              />

              <FormField
                control={form.control}
                name="publicOnly"
                render={({ field: input }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel>Visibility</FormLabel>
                    <FormDescription>{FIELD_HELP_TEXT.visibility}</FormDescription>
                    <Select
                      value={input.value ? "public" : "internal"}
                      onValueChange={(value) => input.onChange(value === "public")}
                      disabled={isSaving}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper">
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="internal">Internal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SheetCheckbox
                control={form.control}
                name="filterableOnly"
                label="Filterable"
                helpText={FIELD_HELP_TEXT.filterable}
                disabled={isSaving}
              />
              <SheetCheckbox
                control={form.control}
                name="required"
                label="Required"
                helpText={FIELD_HELP_TEXT.required}
                disabled={isSaving}
              />

              {form.formState.errors.root?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {form.formState.errors.root.message}
                </p>
              ) : null}
            </div>

            <SheetFooter className="mt-0 flex-row justify-end gap-3 border-t border-border px-6 py-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function SheetTextArea({
  control,
  name,
  label,
  helpText,
  disabled,
}: {
  control: SheetControl;
  name: "description" | "helpText";
  label: string;
  helpText: string;
  disabled: boolean;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel>{label}</FormLabel>
          <FormDescription>{helpText}</FormDescription>
          <FormControl>
            <Textarea {...field} rows={3} disabled={disabled} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SheetCheckbox({
  control,
  name,
  label,
  helpText,
  disabled,
}: {
  control: SheetControl;
  name: "filterableOnly" | "required";
  label: string;
  helpText: string;
  disabled: boolean;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <label className="flex items-start gap-3 text-sm font-medium text-foreground">
            <FormControl>
              <Checkbox
                checked={field.value}
                disabled={disabled}
                className="mt-0.5"
                onCheckedChange={(value) => field.onChange(value === true)}
              />
            </FormControl>
            <span className="flex min-w-0 flex-col gap-0.5">
              {label}
              <span className="font-normal text-muted-foreground">{helpText}</span>
            </span>
          </label>
        </FormItem>
      )}
    />
  );
}
