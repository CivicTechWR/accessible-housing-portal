import { buildAddress } from "@/lib/address";

type WalkScoreAddress = {
  street1: string;
  street2?: string | null;
  city: string;
  province: string;
  postalCode: string;
  unitNumber?: string | null;
};

export function formatWalkScoreAddress({
  city,
  province,
  postalCode,
  ...street
}: WalkScoreAddress): string {
  return [
    buildAddress(street),
    city.trim(),
    [province.trim(), postalCode.trim()].filter(Boolean).join(" "),
    "Canada",
  ]
    .filter(Boolean)
    .join(", ");
}
