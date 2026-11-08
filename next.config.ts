import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.HOMEHUB_REVIEW === "true" ? ".next-review" : ".next",
  turbopack: {
    root: __dirname,
  },
  // pg-boss (and its pg driver) must load via native require(esm) instead of
  // being bundled, so the email queue worker and enqueuers share one runtime.
  serverExternalPackages: ["pg-boss"],
  images: {
    // Listing images use these hosts outside next/image too; keep img-src in proxy.ts in sync.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "/photos/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
    ],
  },
  // Content-Security-Policy needs a per-request nonce, so proxy.ts sets it.
  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
