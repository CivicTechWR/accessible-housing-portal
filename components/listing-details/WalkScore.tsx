import Link from "next/link";

import type { WalkScoreResult } from "@/lib/walk-score/walk-score.client";

type WalkScoreProps = {
  score: WalkScoreResult;
};

const WALK_SCORE_HOME_URL = "https://www.walkscore.com/";

export function WalkScore({ score }: WalkScoreProps) {
  if (!score) {
    return null;
  }

  if ("unavailable" in score) {
    return (
      <section className="rounded-lg border bg-card p-4" aria-label="Walk Score rating">
        <Link
          href={WALK_SCORE_HOME_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary-text underline-offset-4 hover:underline"
        >
          Get Score
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-4" aria-label="Location scores">
      <Link
        href={score.walk.ws_link}
        target="_blank"
        rel="noopener noreferrer"
        className="block space-y-3"
      >
        <div>
          <h2 className="text-sm font-semibold">Walk Score® rating</h2>
          <p className="text-sm text-muted-foreground">
            {score.walk.score} · {score.walk.description}
          </p>
        </div>
        {score.transit && (
          <div>
            <h3 className="text-sm font-semibold">Transit Score®</h3>
            <p className="text-sm text-muted-foreground">
              {score.transit.score} · {score.transit.description}
            </p>
          </div>
        )}
        {score.bike && (
          <div>
            <h3 className="text-sm font-semibold">Bike Score®</h3>
            <p className="text-sm text-muted-foreground">
              {score.bike.score} · {score.bike.description}
            </p>
          </div>
        )}
      </Link>
      <Link
        href={score.walk.help_link}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        How Walk Score works
      </Link>
    </section>
  );
}
