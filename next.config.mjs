/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // getDownloadURL() from the Firebase Storage client SDK serves every
      // artist avatar/portfolio/document through this host regardless of
      // bucket name — required for next/image to be allowed to optimize
      // Firebase-Storage-hosted images instead of falling back to <img>.
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
    ],
  },
  // No serverActions.allowedOrigins — removing localhost-only restriction so
  // Server Actions work on Vercel and any production domain.
};

export default nextConfig;
