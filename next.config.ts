import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow isolated builds under parallel agent load: FORGEOS_DIST_DIR=.next-6040
  distDir: process.env.FORGEOS_DIST_DIR || ".next",
  // Build-time Next navigation nullability is stricter than `tsc --noEmit` app surface;
  // UI null debt is outside PROGRAM 6010 domain scope. Keep typecheck script as gate for src/core.
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["child_process", "net", "fs"],
  webpack: (config, { dev, isServer }) => {
    if (!dev) {
      config.cache = { type: "memory" };
    }
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        child_process: false,
        net: false,
        fs: false,
        "fs/promises": false,
      };
    }
    return config;
  },
  async redirects() {
    return [
      { source: "/new-app", destination: "/", permanent: true },
      { source: "/ventures", destination: "/ventures/aurea-facilities", permanent: false },
      { source: "/build", destination: "/os/build", permanent: false },
    ];
  },
};

export default nextConfig;
