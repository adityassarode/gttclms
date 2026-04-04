const BACKEND_API_ORIGIN =
  "https://gttclms-bvcyaudmh0ecebg5.centralindia-01.azurewebsites.net";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${BACKEND_API_ORIGIN}/api/auth/:path*`,
      },
      {
        source: "/api/admin/:path*",
        destination: `${BACKEND_API_ORIGIN}/api/admin/:path*`,
      },
      {
        source: "/api/books/:path*",
        destination: `${BACKEND_API_ORIGIN}/api/books/:path*`,
      },
      {
        source: "/api/borrows/:path*",
        destination: `${BACKEND_API_ORIGIN}/api/borrows/:path*`,
      },
      {
        source: "/api/donations/:path*",
        destination: `${BACKEND_API_ORIGIN}/api/donations/:path*`,
      },
      {
        source: "/api/favorites/:path*",
        destination: `${BACKEND_API_ORIGIN}/api/favorites/:path*`,
      },
      {
        source: "/api/reservations/:path*",
        destination: `${BACKEND_API_ORIGIN}/api/reservations/:path*`,
      },
      {
        source: "/api/students/:path*",
        destination: `${BACKEND_API_ORIGIN}/api/students/:path*`,
      },
      {
        source: "/api/student",
        destination: `${BACKEND_API_ORIGIN}/api/student`,
      },
      {
        source: "/api/student/:path*",
        destination: `${BACKEND_API_ORIGIN}/api/student/:path*`,
      },
      {
        source: "/api/users/:path*",
        destination: `${BACKEND_API_ORIGIN}/api/users/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${BACKEND_API_ORIGIN}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
