import { expect } from "@jest/globals";
import type { z } from "zod";

/** Asserts that a Zod safeParse failed with an issue at the dot-joined path. */
export function expectIssueAt(result: z.ZodSafeParseResult<unknown>, path: string) {
  expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain(path);
}
