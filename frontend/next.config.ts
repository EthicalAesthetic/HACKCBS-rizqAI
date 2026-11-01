import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only output standalone for custom Docker container builds; Vercel handles its own serverless packaging
  ...(process.env.DOCKER_BUILD === "true" || process.env.BUILD_STANDALONE === "true"
    ? { output: "standalone" }
    : {}),
};

export default nextConfig;