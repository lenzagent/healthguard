import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Static export for Capacitor APK building
  output: process.env.CAPACITOR_BUILD === "1" ? "export" : undefined,
  
  // PWA headers
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "Cache-Control", value: "no-cache" },
        ],
      },
    ];
  },

  // Turbopack config  
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Allow camera access in standalone PWA mode
  async rewrites() {
    return [];
  },
};

export default nextConfig;
