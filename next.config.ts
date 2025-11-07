import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // Empty turbopack config to silence Next.js 16 warning
  // (Turbopack doesn't need the fs/path fallback that webpack required)
  turbopack: {},
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