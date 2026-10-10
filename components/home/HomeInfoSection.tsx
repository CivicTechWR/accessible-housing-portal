export function HomeInfoSection() {
  return (
    <section className="grid gap-10 md:grid-cols-2">
      <div>
        <h2>For case workers and housing support staff</h2>
        <p className="mt-3 text-muted-foreground">
          Finding a unit that works for a client often means informal calls, several listing sites,
          and checking accessibility details by hand. Home Hub puts listings from vetted providers
          in one place, on a map you can filter by accessibility and affordability features. Saved
          filters and alerts are coming soon.
        </p>
      </div>
      <div>
        <h2>For housing providers and developers</h2>
        <p className="mt-3 text-muted-foreground">
          Accessible and affordable units do the most good when they go to tenants who need their
          features. Home Hub puts your listings in front of the case workers and support staff
          searching on behalf of those tenants, with accessibility and affordability details up
          front.
        </p>
      </div>
    </section>
  );
}
