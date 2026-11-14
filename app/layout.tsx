import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/site-header/SiteHeader";
import { SiteFooter } from "@/components/site-footer/SiteFooter";
import { QueryProvider } from "./query-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Home Hub — Connect with affordable housing",
  description: "Connecting social workers with affordable housing providers in Waterloo Region.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // next-themes renders an inline script, which the CSP set in proxy.ts only allows with this nonce.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          nonce={nonce}
        >
          <QueryProvider>
            {/* Full-screen pages (such as /listings) render a [data-fullscreen] element. The header and
                page content then fill exactly one screen, the page sizes itself with flex-1 instead of
                measuring the header, and the footer sits below the fold. Other pages are unaffected:
                this wrapper is display: contents for them. */}
            <div className="peer/shell contents has-[[data-fullscreen]]:flex has-[[data-fullscreen]]:h-dvh has-[[data-fullscreen]]:shrink-0 has-[[data-fullscreen]]:flex-col">
              <SiteHeader />
              <div className="flex-1 has-[[data-fullscreen]]:flex has-[[data-fullscreen]]:min-h-0 has-[[data-fullscreen]]:flex-col">
                {children}
              </div>
            </div>
            {/* Pages can render a [data-hide-site-footer-mobile] element to hide the footer below md.
                Pure CSS, so the footer never flashes in before hydration. */}
            <SiteFooter className="max-md:peer-has-[[data-hide-site-footer-mobile]]/shell:hidden" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
