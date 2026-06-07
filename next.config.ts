import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pptxgenjs is a server-only dependency; keep it out of the client bundle.
  serverExternalPackages: ["pptxgenjs"],
};

export default nextConfig;
