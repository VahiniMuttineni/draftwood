/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    // any experimental features can go here
  },
  async rewrites() {
    const isDev = process.env.NODE_ENV !== "production";
    const backendUrl = isDev ? "http://localhost:6203" : "https://draftwood-backend.onrender.com";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
