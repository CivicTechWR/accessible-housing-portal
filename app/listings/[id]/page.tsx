import { notFound } from "next/navigation";

import { getListingByIdService } from "@/lib/listings/listing.service";
import { ListingDetails } from "@/components/listing-details/ListingDetails";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ListingDetailsPage({ params }: Readonly<PageProps>) {
  const { id } = await params;
  const result = await getListingByIdService(id);

  if (!result.ok) {
    notFound();
  }

  const details = result.value.data;

  return (
    <ListingDetails
      title={details.title}
      editUrl={details.editUrl}
      price={details.price}
      unitNumber={details.unitNumber}
      street1={details.address.street1}
      street2={details.address.street2}
      city={details.address.city}
      postalCode={details.address.postalCode}
      beds={details.beds}
      baths={details.baths}
      sqft={details.sqft}
      images={details.images}
      timeAgo={details.timeAgo}
      features={details.features}
      contactName={details.contact?.name}
      contactEmail={details.contact?.email}
      contactPhone={details.contact?.phone}
    />
  );
}
