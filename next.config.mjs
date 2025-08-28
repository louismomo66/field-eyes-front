/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Only use basePath in production, not in development
  ...(process.env.NODE_ENV === 'production' ? {
    basePath: '/app',
    assetPrefix: '/app',
  } : {}),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['field-eyes.com', 'api.field-eyes.com'],
    unoptimized: process.env.NODE_ENV === 'development',
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/app/**',
      },
    ],
  },
}

export default nextConfig
