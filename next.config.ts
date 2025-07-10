import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Add webpack configuration for Prisma
  // webpack: (config, { isServer }) => {
  //   if (isServer) {
  //     config.externals.push('@prisma/client')
  //   }
  //   return config
  // },
}

export default nextConfig