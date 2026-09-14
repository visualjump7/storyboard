/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Every page here is force-dynamic and reads live data, so the client
    // router must never replay a cached render: without this, creating a
    // project and hopping back to its workspace within 30s could show the
    // list from before the create.
    staleTimes: { dynamic: 0 },
  },
};

export default nextConfig;
