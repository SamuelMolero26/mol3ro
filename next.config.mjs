import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Keep the CSP in one place so audit tools and headers stay in sync.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.vercel-insights.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https://api.github.com https://github.com https://*.vercel-insights.com https://va.vercel-scripts.com",
  "frame-src 'self' https://github.com",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const GITHUB_PROXY_CSP = [
  "default-src 'none'",
  "script-src 'none'",
  "style-src 'unsafe-inline' https://github.githubassets.com",
  "font-src https://github.githubassets.com data:",
  "img-src data: blob: https://github.com https://*.githubusercontent.com https://*.githubassets.com",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri https://github.com",
  "form-action 'none'",
  "frame-ancestors 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Content-Security-Policy", value: CSP },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
  },
  experimental: {
    optimizePackageImports: ["@vercel/analytics"],
  },
  // Silence the turbopack.root warning triggered by the stray parent
  // package-lock at /Users/samuel/package-lock.json — anchor turbopack
  // explicitly to this repo.
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        // Shared security headers also apply to same-origin iframe routes.
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
      // Last matching value wins, so these exact routes retain the global
      // security headers while allowing only the assets their HTML requires.
      {
        source: "/api/github-html",
        headers: [{ key: "Content-Security-Policy", value: GITHUB_PROXY_CSP }],
      },
      {
        source: "/api/pr-html",
        headers: [{ key: "Content-Security-Policy", value: GITHUB_PROXY_CSP }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/resume-preview.png",
        destination: "/resume-preview.webp",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
