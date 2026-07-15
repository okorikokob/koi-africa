import { cookies } from "next/headers";
import { createServerClient, createAuthActions } from "@insforge/sdk/ssr";

const config = {
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
};

/**
 * Reads the admin session from cookies. Use in Server Components / layouts
 * that need to know who's logged in (middleware already gates access).
 */
export async function getAdminUser() {
  const cookieStore = await cookies();
  const client = createServerClient({ ...config, cookies: cookieStore });
  const { data, error } = await client.auth.getCurrentUser();
  if (error || !data?.user) return null;
  return data.user;
}

/**
 * Cookie-writing auth actions (sign in / sign out) for use inside Server Actions.
 */
export async function getAuthActions() {
  const cookieStore = await cookies();
  return createAuthActions({ ...config, cookies: cookieStore });
}
