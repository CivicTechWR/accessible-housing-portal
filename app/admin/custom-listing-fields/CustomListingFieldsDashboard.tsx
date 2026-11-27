"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { AppPageShell, PageHeader, pageWidths } from "@/components/page-shell/AppPageShell";
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
    <AppPageShell>
      <div className={cn("mx-auto space-y-6", pageWidths.wide)}>
        <PageHeader
          title="Custom listing fields"
          description="Fields that appear on listings and in search filters. Renters and partners see them in the order shown here. Drag a row to reorder it, or select rows to change their category."
          actions={
            <Button
              type="button"
              onClick={() => dashboard.openCreateDialog()}
              disabled={dashboard.isCreating}
            >
              <HugeiconsIcon
                icon={Add01Icon}
                strokeWidth={1.75}
                data-icon="inline-start"
                aria-hidden
              />
              Add field
            </Button>
          }
        />

        <CustomListingFieldsTable {...dashboard.tableProps} />

        {dashboard.feedback ? (
          <p
            className={cn(
              "text-sm",
              dashboard.feedback.status === "success"
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-destructive",
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
    </AppPageShell>
  );
}
