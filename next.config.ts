import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Empty turbopack config to silence Next.js 16 warning
  // (Turbopack doesn't need the fs/path fallback that webpack required)
  turbopack: {},
  // Configure server external packages for Prisma 7.x with LibSQL adapter
  serverExternalPackages: [
    '@prisma/client',
    '@prisma/adapter-libsql',
    '@libsql/client',
  ],
  // Allow local network access for development
  allowedDevOrigins: ['192.168.1.112'],
  webpack(config, { isServer }) {
    // disabling fs and path to avoid the tears
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
      };
    }
    return config;
  }
}

export default nextConfig