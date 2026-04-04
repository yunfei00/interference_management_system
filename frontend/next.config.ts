import type { NextConfig } from "next";

const envExtra =
  process.env.NEXT_DEV_ALLOWED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

/** 允许从局域网 IP 访问 dev server（含 Host / Origin 校验）。通过 NEXT_DEV_ALLOWED_ORIGINS 追加。 */
const allowedDevOrigins = Array.from(
  new Set([
    "127.0.0.1",
    "localhost",
    "::1",
    "192.168.186.1",
    "192.168.3.90",
    ...envExtra,
  ]),
);

const nextConfig: NextConfig = {
  typedRoutes: true,
  allowedDevOrigins,
  async redirects() {
    return [
      {
        source: "/dashboard/datasets",
        destination: "/dashboard/electromagnetic/interference/datasets",
        permanent: true,
      },
      {
        source: "/dashboard/tools",
        destination: "/dashboard/electromagnetic/interference/tools",
        permanent: true,
      },
      {
        source: "/dashboard/hosts",
        destination: "/dashboard/electromagnetic/interference/hosts",
        permanent: true,
      },
      {
        source: "/dashboard/commands",
        destination: "/dashboard/electromagnetic/interference/commands",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
