import type { NextConfig } from "next";

/**
 * Set PAGES_BASE_PATH (e.g. "/sura-dubai") to build a static copy for GitHub Pages,
 * which serves the site from a sub-path. Left unset, this is a normal Next.js build.
 */
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  ...(basePath
    ? { output: "export" as const, basePath, trailingSlash: true, distDir: ".next-pages" }
    : {}),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
