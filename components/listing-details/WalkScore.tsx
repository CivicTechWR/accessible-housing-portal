import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon, WalkingIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import type { WalkScoreResult } from "@/lib/walk-score/walk-score.client";

export const WALK_SCORE_ATTRIBUTION_URL = "https://www.redfin.com/how-walk-score-works";

const footerLinkClassName = "text-primary-text underline-offset-4 hover:underline";
const tileClassName = "rounded-xl border bg-card p-4 text-card-foreground dark:border-white/12";

type WalkScoreProps = {
  score: WalkScoreResult;
  address: string;
};

/** Stat tiles for the listing page's Location section, which supplies the section heading. */
export function WalkScore({ score, address }: WalkScoreProps) {
  if (!score) {
    return (
      <section
        aria-label="Walk Score rating"
        className={`${tileClassName} flex flex-col gap-4 sm:flex-row sm:items-center`}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <HugeiconsIcon icon={WalkingIcon} strokeWidth={2} className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold tracking-normal">Walk Score® rating</h3>
          <p className="text-sm text-muted-foreground">
            See how walkable this address is, and how close it is to transit.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link
            href={`https://www.walkscore.com/score/${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get Walk Score
            <HugeiconsIcon
              icon={ArrowUpRight01Icon}
              strokeWidth={2}
              data-icon="inline-end"
              aria-hidden
            />
          </Link>
        </Button>
      </section>
    );
  }

  const tiles = [
    { title: "Walk Score® rating", ...score.walk },
    score.transit && { title: "Transit Score® rating", ...score.transit },
    score.bike && { title: "Bike Score® rating", ...score.bike },
  ].filter((item): item is { title: string; score: number; description: string } => Boolean(item));

  return (
    <section aria-label="Location scores">
      {/* One link around every tile, to Walk Score's explanation of the ratings. */}
      <Link
        href={score.walk.help_link}
        target="_blank"
        rel="noopener noreferrer"
        className="group grid gap-3 rounded-xl sm:grid-cols-3"
      >
        {tiles.map((tile) => (
          <div key={tile.title} className={`${tileClassName} group-hover:bg-muted/60`}>
            <h3 className="text-sm font-medium tracking-normal text-muted-foreground group-hover:underline">
              {tile.title}
            </h3>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{tile.score}</p>
            <p className="text-sm text-foreground">{tile.description}</p>
          </div>
        ))}
      </Link>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
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
