import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { getDashboardPath } from '@/lib/routes';

const employeeRoutes = ['/dashboard', '/goals', '/checkins'];
const managerRoutes = ['/manager'];
const adminRoutes = ['/admin'];

function getRoleFromPath(pathname: string): 'employee' | 'manager' | 'admin' | null {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/manager')) return 'manager';
  if (employeeRoutes.some((r) => pathname === r || pathname.startsWith(r + '/'))) return 'employee';
  return null;
}

export default withAuth(
  function middleware(req) {
    const pathname = req.nextUrl.pathname;
    const token = req.nextauth.token;
    const role = token?.role as string;

    if (token?.mustChangePassword && pathname !== '/change-password' && !pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/change-password', req.url));
    }

    const requiredRole = getRoleFromPath(pathname);
    if (requiredRole && role !== requiredRole) {
      return NextResponse.redirect(new URL(getDashboardPath(role as 'employee' | 'manager' | 'admin'), req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        if (pathname === '/change-password') return !!token;
        const isProtected =
          employeeRoutes.some((r) => pathname === r || pathname.startsWith(r + '/')) ||
          managerRoutes.some((r) => pathname.startsWith(r)) ||
          adminRoutes.some((r) => pathname.startsWith(r));
        return isProtected ? !!token : true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/goals/:path*',
    '/checkins/:path*',
    '/change-password',
    '/manager/:path*',
    '/admin/:path*',
  ],
};
