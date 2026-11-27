// One way to write a listing's facts everywhere: search cards, the detail page, the form preview
// and My listings.

export function formatRent(price: number) {
  return `$${price.toLocaleString("en-CA")}`;
}

/** Shown after formatRent, usually in a lighter style. */
export const RENT_PERIOD = "/mo";

export function formatBeds(beds: number) {
  if (beds === 0) return "Studio";
  return `${beds.toLocaleString("en-CA")} ${beds === 1 ? "bed" : "beds"}`;
}

export function formatBaths(baths: number) {
  return `${baths.toLocaleString("en-CA")} ${baths === 1 ? "bath" : "baths"}`;
}

export function formatArea(sqft: number) {
  return `${sqft.toLocaleString("en-CA")} sq ft`;
}

/** "2 beds · 1 bath · 830 sq ft", leaving out the area when it isn't known. */
export function formatRooms(beds: number, baths: number, sqft: number | null) {
  return [formatBeds(beds), formatBaths(baths), sqft === null ? null : formatArea(sqft)]
    .filter(Boolean)
    .join(" · ");
}

/** A calendar date such as "May 15, 2026" from an ISO "YYYY-MM-DD" string. */
export function formatListingDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Feature and category names arrive in title case from the data ("Main Entrance is
 * Barrier-Free"). Lowercases every word after the first to match the app's sentence case,
 * leaving all-caps words of two or more letters (acronyms such as "TTY") alone.
 */
export function toSentenceCase(text: string) {
  // In an all-caps heading such as "ENTRY & EXTERIOR" every word looks like an acronym.
  const isAllCaps = text === text.toUpperCase();
  const lowered = text
    .split(" ")
    .map((word) => (!isAllCaps && /^[A-Z0-9]{2,}$/.test(word) ? word : word.toLowerCase()))
    .join(" ");
  return lowered.charAt(0).toUpperCase() + lowered.slice(1);
}
