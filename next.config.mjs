// Content-Security-Policy.
//
// 'unsafe-inline' for styles is required by the encounter view's inline style
// attributes; for scripts it's required by Next.js's own bootstrap inline
// scripts (a nonce-based CSP is the stricter follow-up once there's middleware).
// 'unsafe-eval' is dev-only — Next's dev runtime needs it; production does not.
// Google Fonts is allowed because EncounterView loads Newsreader/Plex from it —
// self-hosting the fonts (so clinician IPs never reach Google) is a noted
// follow-up before real PHI traffic.
const isDev = process.env.NODE_ENV === "development";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self' https://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PHI never belongs in the client bundle. Server Components + route handlers
  // keep case data and the LLM call on the server by default.
  experimental: {
    serverActions: { bodySizeLimit: "1mb" },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Ambient scribe will need microphone=(self) when it lands; until
          // then nothing in the app touches these capabilities.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
      {
        // API responses carry PHI (case payloads, notes, CDS answers). They
        // must never land in a shared or browser cache.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
