import "server-only";

import { z } from "zod";

const walkScoreApiResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal(1),
    walkscore: z.number(),
    description: z.string(),
    ws_link: z.url(),
    help_link: z.url(),
    logo_url: z.url(),
    transit: z
      .object({
        score: z.number(),
        description: z.string(),
      })
      .optional(),
    bike: z
      .object({
        score: z.number(),
        description: z.string(),
      })
      .optional(),
  }),
  z.object({ status: z.literal(2) }),
  z.object({ status: z.literal(30) }),
  z.object({ status: z.literal(40) }),
  z.object({ status: z.literal(41) }),
  z.object({ status: z.literal(42) }),
]);

type WalkScoreApiResponse = z.infer<typeof walkScoreApiResponseSchema>;

type ScoreDetails = {
  score: number;
  description: string;
};

export type WalkScoreData = {
  walk: ScoreDetails & {
    ws_link: string;
    help_link: string;
    logo_url: string;
  };
  transit?: ScoreDetails;
  bike?: ScoreDetails;
};

export type WalkScoreResult = WalkScoreData | null;

export type WalkScoreInput = {
  address: string;
  latitude?: number | null;
  longitude?: number | null;
};

export async function getWalkScore({
  address,
  latitude,
  longitude,
}: WalkScoreInput): Promise<WalkScoreResult> {
  if (latitude == null || longitude == null) {
    return null;
  }

  const apiKey = process.env.WALKSCORE_API_KEY;

  if (!apiKey) {
    return null;
  }

  const url = new URL("https://api.walkscore.com/score");
  url.search = new URLSearchParams({
    format: "json",
    transit: "1",
    bike: "1",
    address,
    lat: String(latitude),
    lon: String(longitude),
    wsapikey: apiKey,
  }).toString();

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      console.warn("[walk-score] API request returned a non-success HTTP status.");
      return null;
    }

    const parsed = walkScoreApiResponseSchema.safeParse(await response.json());

    if (!parsed.success) {
      console.warn("[walk-score] API returned an invalid response.");
      return null;
    }

    return mapWalkScoreResponse(parsed.data);
  } catch {
    console.warn("[walk-score] API request failed or timed out.");
    return null;
  }
}

function mapWalkScoreResponse(response: WalkScoreApiResponse): WalkScoreResult {
  switch (response.status) {
    case 1:
      return {
        walk: {
          score: response.walkscore,
          description: response.description,
          ws_link: response.ws_link,
          help_link: response.help_link,
          logo_url: response.logo_url,
        },
        ...(response.transit ? { transit: response.transit } : {}),
        ...(response.bike ? { bike: response.bike } : {}),
      };
    case 2:
    case 30:
      return null;
    case 40:
    case 41:
    case 42:
      console.warn(`[walk-score] API returned error status ${response.status}.`);
      return null;
  }
}
