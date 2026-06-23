/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Evita o prompt interativo de setup do ESLint durante o build do demo.
  // (A checagem de tipos TypeScript continua ativa.)
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
