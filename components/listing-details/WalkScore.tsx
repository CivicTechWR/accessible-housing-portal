import Link from "next/link";

import type { WalkScoreResult } from "@/lib/walk-score/walk-score.client";

export const WALK_SCORE_ATTRIBUTION_URL = "https://www.redfin.com/how-walk-score-works";

const footerLinkClassName = "text-primary-text underline-offset-4 hover:underline";

type WalkScoreProps = {
  score: WalkScoreResult;
  address: string;
};

export function WalkScore({ score, address }: WalkScoreProps) {
  if (!score) {
    return (
      <section className="rounded-lg border bg-card p-4" aria-label="Walk Score rating">
        <h2 className="text-sm font-semibold">Walk Score® rating</h2>
        <Link
          href={`https://www.walkscore.com/score/${encodeURIComponent(address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block font-medium text-primary-text underline-offset-4 hover:underline"
        >
          Get Score
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-4" aria-label="Location scores">
      <Link
        href={score.walk.help_link}
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
            <h3 className="text-sm font-semibold">Transit Score® rating</h3>
            <p className="text-sm text-muted-foreground">
              {score.transit.score} · {score.transit.description}
            </p>
          </div>
        )}
        {score.bike && (
          <div>
            <h3 className="text-sm font-semibold">Bike Score® rating</h3>
            <p className="text-sm text-muted-foreground">
              {score.bike.score} · {score.bike.description}
            </p>
          </div>
        )}
      </Link>
      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t pt-3 text-xs">
        <a
          href={score.walk.ws_link}
          target="_blank"
          rel="noopener noreferrer"
          className={footerLinkClassName}
        >
          More about this address
        </a>
        <a
          href={WALK_SCORE_ATTRIBUTION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={footerLinkClassName}
        >
          Walk Score® by Redfin
        </a>
      </p>
    </section>
  );
}
