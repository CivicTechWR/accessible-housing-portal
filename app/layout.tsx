import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "WR Housing Bridge — Connect with affordable housing",
  description: "Connecting social workers with affordable housing providers in Waterloo Region.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <QueryProvider>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </QueryProvider>
      </body>
    </html>
  );
}
