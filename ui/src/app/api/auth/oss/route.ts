import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getServerBackendUrl } from '@/lib/apiClient';
import { getAuthProvider } from '@/lib/auth/config';

const OSS_TOKEN_COOKIE = 'dograh_auth_token';
const OSS_USER_COOKIE = 'dograh_auth_user';

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    if (payload.exp && typeof payload.exp === 'number') {
      return Date.now() / 1000 > payload.exp;
    }
  } catch {
    return false;
  }
  return false;
}

export async function GET() {
  const authProvider = await getAuthProvider();

  // Only handle OSS mode
  if (authProvider !== 'local') {
    return NextResponse.json({ error: 'Not in OSS mode' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(OSS_TOKEN_COOKIE)?.value;
  const userCookie = cookieStore.get(OSS_USER_COOKIE)?.value;

  // If no token exists or token is expired, clear cookies and return 401
  if (!token || isJwtExpired(token)) {
    cookieStore.delete(OSS_TOKEN_COOKIE);
    cookieStore.delete(OSS_USER_COOKIE);
    return NextResponse.json({ error: 'Not authenticated or token expired' }, { status: 401 });
  }

  let user = userCookie ? JSON.parse(userCookie) : { id: token, name: 'Local User', provider: 'local' };

  // Sync user info (especially superuser status) from backend /api/v1/auth/me
  try {
    const backendRes = await fetch(`${getServerBackendUrl()}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (backendRes.ok) {
      const me = await backendRes.json();
      user = {
        ...user,
        id: me.id,
        email: me.email,
        organization_id: me.organization_id,
        is_superuser: Boolean(me.is_superuser),
      };
      cookieStore.set(OSS_USER_COOKIE, JSON.stringify(user), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
    }
  } catch {
    // Fall back to existing cookie payload if backend call fails
  }

  // Return the auth info as JSON
  return NextResponse.json({
    token,
    user,
  });
}
