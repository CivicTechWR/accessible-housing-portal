export function HomeInfoSection() {
  return (
    <section className="grid gap-10 md:grid-cols-2">
      <div>
        <h2>For housing navigators and case workers</h2>
        <p className="mt-3 text-muted-foreground">
          Finding a unit that works for a client often means informal calls, several listing sites,
          and checking accessibility details through site visits. Home Hub puts listings from
          values-aligned providers in one place, on a map, with filters for accessibility and
          affordability features. Saved filters and alerts are coming soon!
        </p>
      </div>
      <div>
        <h2>For housing providers and developers</h2>
        <p className="mt-3 text-muted-foreground">
          Accessible and affordable units do the most good when they go to tenants who need their
          features. Home Hub puts your listings in front of housing navigators and case workers from
          trusted social agencies ensuring you fill units efficiently and with supported tenants.
        </p>
      </div>
    </section>
  );
}
