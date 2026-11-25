import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { readFile } from "node:fs/promises";
import { loadBlocks, loadPlaces } from "./neighbourhood.data";

jest.mock("node:fs/promises", () => ({
  readFile: jest.fn(),
}));

const readFileMock = jest.mocked(readFile);

describe("neighbourhood data loading", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retries each loader after JSON parsing fails", async () => {
    readFileMock
      .mockResolvedValueOnce("{")
      .mockResolvedValueOnce("[]")
      .mockResolvedValueOnce("{")
      .mockResolvedValueOnce("[]");

    await expect(loadBlocks()).rejects.toThrow(SyntaxError);
    await expect(loadBlocks()).resolves.toEqual([]);
    await expect(loadPlaces()).rejects.toThrow(SyntaxError);
    await expect(loadPlaces()).resolves.toEqual([]);

    expect(readFileMock).toHaveBeenCalledTimes(4);
  });
});
