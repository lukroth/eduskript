import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Remove output: 'standalone' for CleverCloud compatibility
  serverExternalPackages: ['@prisma/client', 'prisma'],
  eslint: {
    ignoreDuringBuilds: false
  },
  typescript: {
    ignoreBuildErrors: false
  },
  images: {
    domains: [],
    remotePatterns: []
  },
  // Add webpack configuration for Prisma
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@prisma/client')
    }
    return config
  },
  // Optimize for production
  poweredByHeader: false,
  compress: true,
  // Environment variables
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL
  }
}

export default nextConfig