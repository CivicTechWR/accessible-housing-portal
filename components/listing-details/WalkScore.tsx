import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon, WalkingIcon } from "@hugeicons/core-free-icons";

import type { WalkScoreResult } from "@/lib/walk-score/walk-score.client";

export const WALK_SCORE_ATTRIBUTION_URL = "https://www.redfin.com/how-walk-score-works";

const linkClassName = "text-primary-text underline-offset-4 hover:underline";

type WalkScoreProps = {
  score: WalkScoreResult;
  address: string;
};

/** Walk, transit and bike scores under the listing's location map. */
export function WalkScore({ score, address }: WalkScoreProps) {
  if (!score) {
    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <HugeiconsIcon
          icon={WalkingIcon}
          strokeWidth={2}
          className="size-4 shrink-0 text-foreground/70"
          aria-hidden
        />
        <Link
          href={`https://www.walkscore.com/score/${encodeURIComponent(address)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 font-medium ${linkClassName}`}
        >
          See the Walk Score® for this address
          <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} className="size-4" aria-hidden />
        </Link>
      </p>
    );
  }

  const ratings = [
    { title: "Walk Score®", ...score.walk },
    score.transit && { title: "Transit Score®", ...score.transit },
    score.bike && { title: "Bike Score®", ...score.bike },
  ].filter((item): item is { title: string; score: number; description: string } => Boolean(item));

  return (
    <section aria-label="Location scores" className="space-y-2">
      {/* One link around every rating, to Walk Score's explanation of the ratings. */}
      <Link
        href={score.walk.help_link}
        target="_blank"
        rel="noopener noreferrer"
        className="group grid auto-cols-fr grid-flow-col divide-x rounded-xl border bg-card text-card-foreground hover:bg-muted/60 dark:border-white/12 dark:divide-white/12"
      >
        {ratings.map((rating) => (
          <div key={rating.title} className="min-w-0 px-3 py-2.5">
            <h3 className="text-sm font-medium tracking-normal text-muted-foreground group-hover:underline">
              {rating.title}
            </h3>
            <p className="text-2xl font-semibold tracking-normal tabular-nums">{rating.score}</p>
            <p className="text-sm text-foreground">{rating.description}</p>
          </div>
        ))}
      </Link>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a
          href={score.walk.ws_link}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
        >
          More about this address
        </a>
        <a
          href={WALK_SCORE_ATTRIBUTION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
        >
          Walk Score® by Redfin
        </a>
      </p>
    </section>
  );
}
