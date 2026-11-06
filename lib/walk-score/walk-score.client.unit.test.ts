import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { getWalkScore } from "@/lib/walk-score/walk-score.client";

const ORIGINAL_ENV = process.env;
const INPUT = {
  address: "123 Main Street, Waterloo, ON",
  latitude: 43.4643,
  longitude: -80.5204,
};
const API_KEY = "test-walk-score-key";
const ORIGINAL_FETCH = global.fetch;
const SUCCESS_RESPONSE = {
  status: 1,
  walkscore: 82,
  description: "Very Walkable",
  ws_link: "https://www.walkscore.com/score/123-Main-St-Waterloo-ON",
  help_link: "https://www.walkscore.com/how-it-works/",
  logo_url: "https://cdn.walk.sc/images/api-logo.png",
  transit: { score: 64, description: "Good Transit" },
  bike: { score: 71, description: "Very Bikeable" },
};

const fetchMock = jest.fn<typeof fetch>();

function mockFetchResponse(status: number, body: unknown, jsonError?: Error): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (jsonError) {
        throw jsonError;
      }
      return body;
    },
  } as Response;
}

describe("getWalkScore", () => {
  let warnSpy: jest.Spied<typeof console.warn>;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, WALKSCORE_API_KEY: API_KEY };
    global.fetch = fetchMock;
    fetchMock.mockReset();
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    global.fetch = ORIGINAL_FETCH;
    warnSpy.mockRestore();
  });

  it("returns null without an API key and does not call fetch", async () => {
    delete process.env.WALKSCORE_API_KEY;

    await expect(getWalkScore(INPUT)).resolves.toBeNull();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("returns null without coordinates and does not call fetch", async () => {
    await expect(
      getWalkScore({ address: INPUT.address, latitude: null, longitude: null }),
    ).resolves.toBeNull();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("requests and maps walk, transit, and bike scores without caching", async () => {
    fetchMock.mockResolvedValue(mockFetchResponse(200, SUCCESS_RESPONSE));
    const timeoutSpy = jest
      .spyOn(AbortSignal, "timeout")
      .mockImplementation(() => new AbortController().signal);

    await expect(getWalkScore(INPUT)).resolves.toEqual({
      walk: {
        score: 82,
        description: "Very Walkable",
        ws_link: SUCCESS_RESPONSE.ws_link,
        help_link: SUCCESS_RESPONSE.help_link,
        logo_url: SUCCESS_RESPONSE.logo_url,
      },
      transit: SUCCESS_RESPONSE.transit,
      bike: SUCCESS_RESPONSE.bike,
    });

    const [requestedUrl, requestOptions] = fetchMock.mock.calls[0]!;
    const url = new URL(String(requestedUrl));
    expect(url.origin + url.pathname).toBe("https://api.walkscore.com/score");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      format: "json",
      transit: "1",
      bike: "1",
      address: INPUT.address,
      lat: String(INPUT.latitude),
      lon: String(INPUT.longitude),
      wsapikey: API_KEY,
    });
    expect(requestOptions).toMatchObject({ cache: "no-store" });
    expect(requestOptions?.signal).toBeInstanceOf(AbortSignal);
    expect(timeoutSpy).toHaveBeenCalledWith(3000);
    timeoutSpy.mockRestore();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("returns walk score when optional transit and bike scores are absent", async () => {
    const { transit: _transit, bike: _bike, ...walkOnlyResponse } = SUCCESS_RESPONSE;
    fetchMock.mockResolvedValue(mockFetchResponse(200, walkOnlyResponse));

    await expect(getWalkScore(INPUT)).resolves.toEqual({
      walk: {
        score: 82,
        description: "Very Walkable",
        ws_link: SUCCESS_RESPONSE.ws_link,
        help_link: SUCCESS_RESPONSE.help_link,
        logo_url: SUCCESS_RESPONSE.logo_url,
      },
    });
  });

  it.each([2, 30])("returns null without warning for API status %s", async (status) => {
    fetchMock.mockResolvedValue(mockFetchResponse(200, { status }));

    await expect(getWalkScore(INPUT)).resolves.toBeNull();

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it.each([40, 41, 42])("returns null and warns for API status %s", async (status) => {
    fetchMock.mockResolvedValue(mockFetchResponse(200, { status }));

    await expect(getWalkScore(INPUT)).resolves.toBeNull();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.join(" ")).not.toContain(API_KEY);
  });

  it.each([
    ["a network error", new Error(`Request failed for ${API_KEY}`)],
    ["a timeout", new DOMException("Request timed out", "TimeoutError")],
  ])("returns null and warns for %s", async (_name, error) => {
    fetchMock.mockRejectedValue(error);

    await expect(getWalkScore(INPUT)).resolves.toBeNull();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.join(" ")).not.toContain(API_KEY);
  });

  it("returns null and warns when the response is not valid JSON", async () => {
    fetchMock.mockResolvedValue(mockFetchResponse(200, null, new SyntaxError("Invalid JSON")));

    await expect(getWalkScore(INPUT)).resolves.toBeNull();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.join(" ")).not.toContain(API_KEY);
  });

  it("returns null and warns when the JSON does not match the response schema", async () => {
    fetchMock.mockResolvedValue(mockFetchResponse(200, { ...SUCCESS_RESPONSE, walkscore: "82" }));

    await expect(getWalkScore(INPUT)).resolves.toBeNull();

    expect(warnSpy).toHaveBeenCalledWith("[walk-score] API returned an invalid response.");
  });

  it("returns null and warns for a non-success HTTP response", async () => {
    fetchMock.mockResolvedValue(mockFetchResponse(503, null));

    await expect(getWalkScore(INPUT)).resolves.toBeNull();

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});
