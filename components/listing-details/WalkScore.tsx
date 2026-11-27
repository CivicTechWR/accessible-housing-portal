import Link from "next/link";

import type { WalkScoreResult } from "@/lib/walk-score/walk-score.client";

export const WALK_SCORE_ATTRIBUTION_URL = "https://www.redfin.com/how-walk-score-works";

const footerLinkClassName = "text-primary-text underline-offset-4 hover:underline";

type WalkScoreProps = {
  score: WalkScoreResult;
  address: string;
};

/** A section of the listing page. ListingDetails gives it the same spacing as its other sections. */
export function WalkScore({ score, address }: WalkScoreProps) {
  if (!score) {
    return (
      <section aria-label="Walk Score rating">
        <h2 className="mb-2 text-xl font-semibold tracking-tight">Walk Score® rating</h2>
        <p className="text-[15px] text-muted-foreground">
          See how walkable this address is, and how close it is to transit.{" "}
          <Link
            href={`https://www.walkscore.com/score/${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary-text underline-offset-4 hover:underline"
          >
            Get Score
          </Link>
        </p>
      </section>
    );
  }

  const others = [
    score.transit && { title: "Transit Score® rating", ...score.transit },
    score.bike && { title: "Bike Score® rating", ...score.bike },
  ].filter((item): item is { title: string; score: number; description: string } => Boolean(item));

  return (
    <section aria-label="Location scores">
      <Link
        href={score.walk.help_link}
        target="_blank"
        rel="noopener noreferrer"
        className="group grid gap-x-8 gap-y-4 sm:grid-cols-3"
      >
        <div>
          <h2 className="text-base font-semibold tracking-normal group-hover:underline">
            Walk Score® rating
          </h2>
          <p className="text-[15px] text-muted-foreground">
            {score.walk.score} · {score.walk.description}
          </p>
        </div>
        {others.map((item) => (
          <div key={item.title}>
            <h3 className="text-base font-semibold tracking-normal group-hover:underline">
              {item.title}
            </h3>
            <p className="text-[15px] text-muted-foreground">
              {item.score} · {item.description}
            </p>
          </div>
        ))}
      </Link>
      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
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
