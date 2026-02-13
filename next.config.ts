import type { NextConfig } from "next";
import { execSync } from "child_process";

function getCommitSha(): string {
  // Railway provides this automatically
  if (process.env.RAILWAY_GIT_COMMIT_SHA) {
    return process.env.RAILWAY_GIT_COMMIT_SHA;
  }
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_COMMIT_SHA: getCommitSha(),
    NEXT_PUBLIC_ENABLE_DEBUGGING: process.env.ENABLE_DEBUGGING ?? "false",
  },
  headers: async () => [
    // ServiceWorker headers are handled by the route handler at /sw.js/route.ts
  ],
};

export default nextConfig;
