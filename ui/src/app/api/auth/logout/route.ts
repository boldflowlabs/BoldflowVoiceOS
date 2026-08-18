import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const OSS_TOKEN_COOKIE = 'dograh_auth_token';
const OSS_USER_COOKIE = 'dograh_auth_user';

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.delete(OSS_TOKEN_COOKIE);
  cookieStore.delete(OSS_USER_COOKIE);

  cookieStore.set(OSS_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    expires: new Date(0),
    path: '/',
  });

  cookieStore.set(OSS_USER_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    expires: new Date(0),
    path: '/',
  });

  return NextResponse.json({ success: true });
}
