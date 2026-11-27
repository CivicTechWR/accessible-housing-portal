import { describe, expect, it } from "@jest/globals";

import { formatListingDate, formatRooms, toSentenceCase } from "./listing-format";

describe("toSentenceCase", () => {
  it("lowercases title-case feature names but keeps acronyms", () => {
    expect(toSentenceCase("Main Entrance is Barrier-Free")).toBe("Main entrance is barrier-free");
    expect(toSentenceCase("TTY Phone Available")).toBe("TTY phone available");
  });

  it("treats an all-caps heading as words, not acronyms", () => {
    expect(toSentenceCase("ENTRY & EXTERIOR")).toBe("Entry & exterior");
  });
});

describe("listing facts", () => {
  it("writes studios and singular rooms in words, and skips an unknown area", () => {
    expect(formatRooms(0, 1, null)).toBe("Studio · 1 bath");
    expect(formatRooms(2, 1, 830)).toBe("2 beds · 1 bath · 830 sq ft");
  });

  it("formats an ISO date without shifting it across time zones", () => {
    expect(formatListingDate("2026-05-15")).toBe("May 15, 2026");
  });
});
