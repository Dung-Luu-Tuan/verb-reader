import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Capacitor still needs a static `out/` folder. Vercel uses the server build so the Gemini key stays on the server.
  ...(process.env.CAPACITOR === "1" ? { output: "export" as const } : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
