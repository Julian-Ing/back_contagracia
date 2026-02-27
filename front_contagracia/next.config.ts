import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack (dev) — silencia la advertencia de "webpack config sin turbopack config"
  // El alias de canvas no es necesario en dev porque los componentes PDF se cargan
  // solo en el cliente (dynamic + ssr: false), nunca en el servidor.
  turbopack: {},

  // Webpack (producción) — evita error de módulo nativo `canvas` en @react-pdf/renderer
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
