import type { NeighbourhoodDetailsResult } from "@/lib/neighbourhood/neighbourhood";
import {
  formatDistance,
  TRANSIT_GROCERY_LIMIT_MINUTES,
  WALKING_GROCERY_LIMIT_MINUTES,
} from "@/lib/neighbourhood/neighbourhood";

const STATCAN_URL = "https://www150.statcan.gc.ca/";
const STATCAN_LICENSE_URL = "https://www.statcan.gc.ca/en/reference/licence";
const OSM_URL = "https://www.openstreetmap.org/copyright";
const footerLinkClassName = "text-primary-text underline-offset-4 hover:underline";

type NeighbourhoodDetailsProps = {
  details: NeighbourhoodDetailsResult | null;
};

const accessRows = [
  { label: "Health care", key: "health_care" },
  { label: "Child care", key: "child_care" },
  { label: "Jobs", key: "jobs" },
  { label: "Culture and arts", key: "culture_arts" },
  { label: "Sport and recreation", key: "sport_recreation" },
] as const;

function formatGroceryMinutes(minutes: number | null, limit: number) {
  return minutes === null ? `None within ${limit} min` : `${minutes} min`;
}

function formatAccess(value: number | null) {
  return value === null ? "Not available" : `Better than ${value}%`;
}

export function NeighbourhoodDetails({ details }: NeighbourhoodDetailsProps) {
  if (!details) {
    return null;
  }

  const { block } = details;

  return (
    <section className="rounded-lg border bg-card p-4" aria-label="Neighbourhood">
      <h2 className="text-sm font-semibold">Neighbourhood</h2>
      <div className="mt-3 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Nearby places</h3>
          <ul className="mt-2 space-y-3">
            {details.nearby.map((item) => (
              <li key={item.groupId} className="text-sm">
                <p className="font-medium">{item.label}</p>
                {item.place && item.distanceM !== null ? (
                  <div className="text-muted-foreground">
                    <p>
                      {item.place.name || "Unnamed"} · {formatDistance(item.distanceM)}
                    </p>
                    {item.place.routes && <p>Routes: {item.place.routes.replaceAll(";", ", ")}</p>}
                    {item.place.shelter === "yes" && <p>Shelter available</p>}
                    {item.place.bench === "yes" && <p>Bench available</p>}
                    {item.place.wheelchair === "yes" && <p>Wheelchair accessible</p>}
                    {item.place.wheelchair === "limited" && <p>Limited wheelchair access</p>}
                    {item.place.wheelchair === "no" && <p>Not wheelchair accessible</p>}
                    {(item.groupId === "clinic" || item.groupId === "pharmacy") &&
                      item.place.opening_hours && <p>Hours: {item.place.opening_hours}</p>}
                  </div>
                ) : (
                  <p className="text-muted-foreground">None within 5 km</p>
                )}
              </li>
            ))}
          </ul>
        </div>

        {block && (
          <>
            <div>
              <h3 className="text-sm font-semibold">Travel time to nearby grocery stores</h3>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Walking</dt>
                  <dd>
                    {formatGroceryMinutes(
                      block.walking.grocery_minutes[0],
                      WALKING_GROCERY_LIMIT_MINUTES,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Transit</dt>
                  <dd>
                    {formatGroceryMinutes(
                      block.transit_peak.grocery_minutes[0],
                      TRANSIT_GROCERY_LIMIT_MINUTES,
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Access compared with</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Each value is the share of Waterloo Region blocks with lower access.
              </p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th scope="col" className="py-1 pr-3 font-medium">
                        Amenity
                      </th>
                      <th scope="col" className="py-1 pr-3 font-medium">
                        Walking
                      </th>
                      <th scope="col" className="py-1 font-medium">
                        Transit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessRows.map((row) => (
                      <tr key={row.key} className="border-t">
                        <th scope="row" className="py-1 pr-3 font-medium">
                          {row.label}
                        </th>
                        <td className="py-1 pr-3">{formatAccess(block.walking.access[row.key])}</td>
                        <td className="py-1">{formatAccess(block.transit_peak.access[row.key])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      <footer className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t pt-3 text-xs">
        <a
          href={STATCAN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={footerLinkClassName}
        >
          Statistics Canada Spatial Access Measures 2024
        </a>
        <a
          href={STATCAN_LICENSE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={footerLinkClassName}
        >
          Statistics Canada Open Licence
        </a>
        <a href={OSM_URL} target="_blank" rel="noopener noreferrer" className={footerLinkClassName}>
          © OpenStreetMap contributors
        </a>
      </footer>
    </section>
  );
}
