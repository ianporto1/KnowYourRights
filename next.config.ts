import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure environment variables are available
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // Optimize for Vercel
  images: {
    unoptimized: false,
  },
};

export default nextConfig;
