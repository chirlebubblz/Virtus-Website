/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/oak-harbor',
        destination: '/oak-harbor/index.html',
      },
      {
        source: '/oak-harbor-growth-strategy',
        destination: '/oak-harbor/index.html',
      },
    ];
  },
};

export default nextConfig;
