/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ── Performance ──
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  // Tree-shake heavy libs so each page only ships what it uses
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
      preventFullImport: true,
    },
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  // Disable x-powered-by header (tiny perf + security)
  poweredByHeader: false,
  async redirects() {
    return [
      { source: '/employee-dashboard', destination: '/dashboard', permanent: true },
      { source: '/employee-goals', destination: '/goals', permanent: true },
      { source: '/employee-goals/new', destination: '/goals/new', permanent: true },
      { source: '/employee-checkins', destination: '/checkins', permanent: true },
      { source: '/manager-dashboard', destination: '/manager/dashboard', permanent: true },
      { source: '/admin-dashboard', destination: '/admin/dashboard', permanent: true },
    ];
  },
};

module.exports = nextConfig;
