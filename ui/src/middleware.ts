import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const OSS_TOKEN_COOKIE = 'dograh_auth_token';
const OSS_USER_COOKIE = 'dograh_auth_user';

// Paths that don't require authentication
const PUBLIC_PATHS = [
  '/auth/login',
  '/api/auth',
  '/api/config',
  '/handler',
];

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64);
    const payload = JSON.parse(jsonPayload);
    if (payload.exp && typeof payload.exp === 'number') {
      return Date.now() / 1000 > payload.exp;
    }
  } catch {
    return false;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect any public signup requests to login page
  if (pathname === '/auth/signup' || pathname === '/signup') {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Allow public paths without auth
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(OSS_TOKEN_COOKIE)?.value;

  // If no session token or token is expired, redirect unauthenticated users to login and clear cookies
  if (!token || isJwtExpired(token)) {
    const loginUrl = new URL('/auth/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(OSS_TOKEN_COOKIE);
    response.cookies.delete(OSS_USER_COOKIE);
    return response;
  }

  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public static assets (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf)).*)',
  ],
};
