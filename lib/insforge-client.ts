import { createClient } from "@insforge/sdk";

/**
 * Browser-side InsForge client (singleton).
 * Use in Client Components only. Session is stored/refreshed via httpOnly cookies.
 */
export const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
});
