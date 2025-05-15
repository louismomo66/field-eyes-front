/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/app',
  assetPrefix: '/app',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['field-eyes.com', 'api.field-eyes.com'],
  },
}

export default nextConfig
