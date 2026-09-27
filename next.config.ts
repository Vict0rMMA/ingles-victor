import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Solo en local: hay otro package-lock.json mas arriba en el disco y Next
  // infiere mal la raiz. En Vercel el repo ya es la raiz, y forzarla aqui
  // puede romper el empaquetado de las funciones.
  ...(process.env.VERCEL ? {} : { outputFileTracingRoot: process.cwd() }),
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
