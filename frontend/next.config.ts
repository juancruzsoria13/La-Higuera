import type { NextConfig } from "next";
const config: NextConfig = {
  turbopack: { root: process.cwd() },
  // Hasta 8 fotos de 5 MB por anuncio, más el margen de multipart.
  experimental: { serverActions: { bodySizeLimit: "41mb" } },
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
    ] }];
  },
};
export default config;
