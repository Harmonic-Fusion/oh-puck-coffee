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
  async rewrites() {
    return [
      {
        source: "/assets/data/:id.json",
        destination: "/api/assets/data/:id",
      },
    ];
  },
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        {
          key: "Content-Type",
          value: "application/javascript; charset=utf-8",
        },
        {
          key: "Cache-Control",
          value: "public, max-age=0, must-revalidate",
        },
        {
          key: "Service-Worker-Allowed",
          value: "/",
        },
      ],
    },
  ],
};

export default nextConfig;
