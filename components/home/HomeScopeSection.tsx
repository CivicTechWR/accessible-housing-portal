const isItems = [
  "A listing website for affordable and accessible units in Waterloo Region—think Realtor.ca for specific types of units.",
  "Free to join",
  "For use by housing navigators, case workers, social support organizations",
  "For use by understanding and flexible housing providers—who are often willing to collaborate with support organizations and tenants in a variety of ways to ensure a stable housing situation.",
];

const isNotItems = [
  "Intended as an alternative to CHAC or the PATHS List.",
  "Providing direct support, referrals, or guidance to find appropriate housing.",
  "A mediator between organizations, individuals and housing providers.",
  "Open to the public.",
];

const lists = [
  { title: "Home Hub is:", items: isItems },
  { title: "Home Hub is not:", items: isNotItems },
];

export function HomeScopeSection() {
  return (
    <section className="grid gap-10 border-t pt-12 md:grid-cols-2">
      {lists.map((list) => (
        <div key={list.title}>
          <h2>{list.title}</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
            {list.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
