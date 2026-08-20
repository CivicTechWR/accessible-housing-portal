import Link from "next/link";

const siteMap = [
  { href: "/", label: "Home" },
  { href: "/listings", label: "Browse Listings" },
];

export function SiteFooter() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl justify-center px-6 py-10">
        <div className="grid w-full max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-3">
            <img
              src="https://civictechwr.org/images/logos/civictechwr_logo_black.webp"
              alt="Civic Tech WR Region"
              className="h-14 invert brightness-0"
            />
            <p className="text-xs text-primary-foreground/70 leading-relaxed">
              Our mission is to bring together people from different sectors and industries to
              actively solve issues facing our local community using design and technology.
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm uppercase tracking-wider">Site Map</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              {siteMap.map((page) => (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    className="hover:text-primary-foreground transition-colors"
                  >
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {/* <div className="space-y-3">
          <h3 className="text-sm uppercase tracking-wider">Resources</h3>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            <li>
              <span className="opacity-60">Mock Link</span>
            </li>
            <li>
              <span className="opacity-60">Mock Link</span>
            </li>
            <li>
              <span className="opacity-60">Mock Link</span>
            </li>
          </ul>
        </div> */}
          <div className="space-y-3">
            <h3 className="text-sm uppercase tracking-wider">Civic Tech WR</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>
                <a
                  href="https://civictechwr.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary-foreground transition-colors"
                >
                  Civic Tech WR
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/CivicTechWR/affordable-housing-portal"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary-foreground transition-colors"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-primary-foreground/20 px-6 py-4 text-center text-xs text-primary-foreground/60">
        WR Housing Bridge
      </div>
    </footer>
  );
}
