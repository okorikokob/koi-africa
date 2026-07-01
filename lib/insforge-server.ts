import { createClient } from "@insforge/sdk";

/**
 * Server-side InsForge client factory.
 *
 * Always create a fresh client per request in Server Components, Route Handlers,
 * and Server Actions — never reuse the browser `insforge` singleton on the server.
 *
 * Pass a user access token to act as that user (e.g. an authenticated admin);
 * omit it for anonymous/public reads.
 */
export function createInsforgeServer(accessToken?: string) {
  return createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    ...(accessToken ? { accessToken } : {}),
  });
}
