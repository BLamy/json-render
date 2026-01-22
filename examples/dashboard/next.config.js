/** @type {import('next').NextConfig} */
const isStaticExport = process.env.STATIC_EXPORT === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  transpilePackages: ["@json-render/core", "@json-render/react"],

  // Enable static export for GitHub Pages deployment
  ...(isStaticExport && {
    output: "export",
    basePath: basePath,
    assetPrefix: basePath,
    trailingSlash: true,
    images: {
      unoptimized: true,
    },
  }),
};

export default nextConfig;
