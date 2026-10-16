import { expect, it } from "@jest/globals";

import { getSafeCallbackPath } from "./callback-url";

it.each([
  "http://localhost//evil.example",
  "//evil.example//evil.example",
  "https://homehub.example/..//evil.example",
])("rejects a callback whose normalized pathname becomes protocol-relative: %s", (callback) => {
  expect(getSafeCallbackPath(callback)).toBe("/");
});

it.each([
  "/listings?status=draft#results",
  "https://homehub.example/listings?status=draft#results",
])("keeps the local path, query, and fragment from %s", (callback) => {
  expect(getSafeCallbackPath(callback)).toBe("/listings?status=draft#results");
});
