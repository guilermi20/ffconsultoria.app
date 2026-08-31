/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Não gerar AGENTS.md/CLAUDE.md automaticamente no repo.
  agentRules: false,
};

module.exports = nextConfig;
