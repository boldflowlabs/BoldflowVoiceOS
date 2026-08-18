import { redirect } from "next/navigation";

import { getServerAccessToken } from "@/lib/auth/server";

export const dynamic = 'force-dynamic';

export default async function RootPage() {
  const accessToken = await getServerAccessToken();

  // If unauthenticated, redirect to login page
  if (!accessToken) {
    redirect('/auth/login');
  }

  // If authenticated, redirect to the home dashboard
  redirect('/home');
}
