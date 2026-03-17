import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage — only allow our project's public bucket
      {
        protocol: 'https',
        hostname: 'clzegkiwnodhqhxemiud.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
