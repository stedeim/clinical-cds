/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PHI never belongs in the client bundle. Server Components + route handlers
  // keep case data and the LLM call on the server by default.
  experimental: {
    serverActions: { bodySizeLimit: "1mb" },
  },
};

export default nextConfig;
