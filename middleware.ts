import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // Add any custom middleware logic here if needed
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages and API routes
        if (req.nextUrl.pathname.startsWith('/api/auth/')) return true;
        if (req.nextUrl.pathname === '/signin') return true;
        if (req.nextUrl.pathname === '/') return true;
        if (req.nextUrl.pathname.startsWith('/auth/error')) return true;
        
        // Require authentication for dashboard and other protected routes
        if (req.nextUrl.pathname.startsWith('/dashboard')) {
          return !!token;
        }
        
        return true; // Allow other routes
      },
    },
    secret: process.env.NEXTAUTH_SECRET || "8a9d4b3f7c6e1a0b2d5f8c7e6a3b1c9d8a7f6e3b2c1d9a8f7e6c3b2d1",
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};