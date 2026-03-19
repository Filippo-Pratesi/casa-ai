import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  images: {
    remotePatterns: [
      // Supabase Storage — only allow our project's public bucket
      {
        protocol: 'https',
        hostname: 'clzegkiwnodhqhxemiud.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Unsplash — for placeholder images in development
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
