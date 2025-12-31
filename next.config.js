/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: {
    unoptimized: true, // Disable image optimization (required for static export)
  },
};

module.exports = nextConfig;
