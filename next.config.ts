import type { NextConfig } from "next";
import { baseURL } from "./baseUrl";

const nextConfig: NextConfig = {
  output: 'export',
  assetPrefix: baseURL,
};

export default nextConfig;
