import type { Metadata } from "next";

import { PageMessage } from "@/components/page-shell/AppPageShell";
import { CustomListingFieldsDashboard } from "@/app/admin/custom-listing-fields/CustomListingFieldsDashboard";
import { getAdminCustomListingFieldsService } from "@/lib/custom-listing-fields/custom-listing-field-admin.service";

export const metadata: Metadata = {
  title: "Custom Listing Fields | WR Housing Bridge",
};

export const dynamic = "force-dynamic";

export default async function CustomListingFieldsPage() {
  const result = await getAdminCustomListingFieldsService({});

  if (!result.ok) {
    return <PageMessage title="Unable to load custom fields">{result.error.message}</PageMessage>;
  }

  return <CustomListingFieldsDashboard initialFields={result.value.data} />;
}
