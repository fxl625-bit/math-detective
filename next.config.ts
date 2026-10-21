import type { NextConfig } from "next";
import { execSync } from "child_process";

const releaseCommit = process.env.RELEASE_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA;
let commitHash = releaseCommit && /^[a-f0-9]{40}$/i.test(releaseCommit) ? releaseCommit.slice(0, 7) : 'unknown';
try {
  if (commitHash === 'unknown') {
    commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    if (execSync('git status --porcelain', { encoding: 'utf-8' }).trim()) {
      commitHash += '-working-tree';
    }
  }
} catch {
  // Not a git repo or git not available
}

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  env: {
    NEXT_PUBLIC_COMMIT_SHA: commitHash,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      const w = require('webpack');
      // Polyfill process for browser (webpack 5 removed default Node polyfills)
      config.plugins.push(
        new w.ProvidePlugin({
          process: 'process/browser',
        })
      );
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        process: require.resolve('process/browser'),
      };
    }
    return config;
  },
  turbopack: {},
};

export default nextConfig;
