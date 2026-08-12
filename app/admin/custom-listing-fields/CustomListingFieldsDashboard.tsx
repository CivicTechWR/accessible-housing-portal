"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AdminCustomListingField } from "@/shared/schemas/custom-listing-fields";
import { BulkEditDialog } from "./components/BulkEditDialog";
import { CustomListingFieldsTable } from "./components/CustomListingFieldsTable";
import { DeleteFieldDialog } from "./components/DeleteFieldDialog";
import { FieldEditorDialog } from "./components/FieldEditorDialog";
import { useCustomListingFieldsDashboard } from "./useCustomListingFieldsDashboard";

export function CustomListingFieldsDashboard({
  initialFields,
}: {
  initialFields: AdminCustomListingField[];
}) {
  const dashboard = useCustomListingFieldsDashboard(initialFields);

  return (
    <main className="min-h-[calc(100vh-7rem)] bg-muted/60 px-5 py-7 text-sm text-foreground md:px-7">
      <div className="mx-auto max-w-[1920px]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Custom Listing Fields</h1>
            <p className="mt-1 text-base text-muted-foreground">
              Manage the custom fields that appear on listings and filters. The order in this table
              is the order renters and partners will see on each listing.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Applicability is independent of category. Changing it affects future duplications;
              existing duplicated listings are unaffected.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Button
              type="button"
              size="lg"
              className="h-10 gap-2 rounded-md px-5 text-sm"
              onClick={() => dashboard.openCreateDialog()}
              disabled={dashboard.isCreating}
            >
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
              Add Field
            </Button>
          </div>
        </div>

        <CustomListingFieldsTable {...dashboard.tableProps} />

        {dashboard.feedback ? (
          <p
            className={cn(
              "mt-4 text-sm",
              dashboard.feedback.status === "success" ? "text-emerald-700" : "text-destructive",
            )}
            role="status"
            aria-live="polite"
          >
            {dashboard.feedback.message}
          </p>
        ) : null}
      </div>

      {dashboard.fieldDialog ? (
        <FieldEditorDialog
          state={dashboard.fieldDialog}
          categories={dashboard.categoryOptions}
          isSaving={dashboard.isCreating}
          onClose={dashboard.closeFieldDialog}
          onCreate={dashboard.handleCreateField}
        />
      ) : null}

      {dashboard.bulkEditOpen ? (
        <BulkEditDialog
          categories={dashboard.categoryOptions}
          selectedCount={dashboard.selectedFieldCount}
          isSaving={dashboard.isBulkSaving}
          onClose={dashboard.closeBulkEditDialog}
          onSubmit={dashboard.handleBulkEdit}
        />
      ) : null}

      {dashboard.deleteTarget ? (
        <DeleteFieldDialog
          field={dashboard.deleteTarget}
          isDeleting={dashboard.pendingFieldId === dashboard.deleteTarget.id}
          onClose={dashboard.closeDeleteDialog}
          onConfirm={() => void dashboard.handleDeleteField()}
        />
      ) : null}
    </main>
  );
}
