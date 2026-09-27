import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Hay otro package-lock.json mas arriba en el disco; sin esto Next infiere
  // mal la raiz del proyecto al empaquetar.
  outputFileTracingRoot: __dirname,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // El microfono es el corazon de la app: hay que permitirlo explicitamente.
          { key: 'Permissions-Policy', value: 'microphone=(self)' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
