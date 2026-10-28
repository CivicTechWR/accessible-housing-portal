import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { getListingByIdService } from "@/lib/listings/listing.service";
import { getListingWalkScoreService } from "@/lib/listings/walk-score.service";
import { ListingDetails } from "@/components/listing-details/ListingDetails";
import { WalkScore } from "@/components/listing-details/WalkScore";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function ListingWalkScore({ listingId }: { listingId: string }) {
  const score = await getListingWalkScoreService(listingId);

  return <WalkScore score={score} />;
}

export default async function ListingDetailsPage({ params }: Readonly<PageProps>) {
  const { id } = await params;
  const result = await getListingByIdService(id);

  if (!result.ok) {
    if (result.error.code === "unauthorized") {
      redirect(`/sign-in?callbackUrl=/listings/${encodeURIComponent(id)}`);
    }
    notFound();
  }

  const details = result.value.data;

  return (
    <ListingDetails
      title={details.title}
      editUrl={details.editUrl}
      price={details.price}
      description={details.description}
      buildingType={details.buildingType}
      leaseTermMonths={details.leaseTermMonths}
      depositInfo={details.depositInfo}
      availableOn={details.availableOn}
      unitNumber={details.unitNumber}
      street1={details.address.street1}
      street2={details.address.street2}
      city={details.address.city}
      postalCode={details.address.postalCode}
      beds={details.beds}
      baths={details.baths}
      sqft={details.sqft}
      heatingType={details.heatingType}
      utilitiesIncluded={details.utilitiesIncluded}
      images={details.images}
      timeAgo={details.timeAgo}
      features={details.features}
      contactName={details.contact?.name}
      contactRole={details.contact?.role}
      contactEmail={details.contact?.email}
      contactPhone={details.contact?.phone}
      applicationUrl={details.applicationUrl}
      applicationEmail={details.applicationEmail}
      applicationPhone={details.applicationPhone}
      applicationInstructions={details.applicationInstructions}
      walkScore={
        <Suspense fallback={<WalkScore score={null} />}>
          <ListingWalkScore listingId={id} />
        </Suspense>
      }
    />
  );
}
