import withPWA from "next-pwa";

const withPWAConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // No serverActions.allowedOrigins — removing localhost-only restriction so
  // Server Actions work on Vercel and any production domain.
};

// Skip the PWA wrapper entirely in dev — it attaches a webpack() config
// function even when disabled, which conflicts with Turbopack (`next dev --turbo`).
export default process.env.NODE_ENV === "development" ? nextConfig : withPWAConfig(nextConfig);
