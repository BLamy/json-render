import createMDX from "@next/mdx";

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["bash-tool", "just-bash", "@mongodb-js/zstd"],
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  async redirects() {
    return [
      {
        source: "/docs/components",
        destination: "/docs/registry",
        permanent: true,
      },
      {
        source: "/docs/actions",
        destination: "/docs/registry#action-handlers",
        permanent: true,
      },
    ];
  },
};

const withMDX = createMDX({});

/** @type {import('next').NextConfig} */
const config = withMDX(nextConfig);
export default config;
