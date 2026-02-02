import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  // Only create client in browser environment
  if (typeof window === "undefined") {
    // Return a stub during SSR/build to prevent errors
    // The actual client will be created on the client side
    return null as unknown as ReturnType<typeof createBrowserClient>;
  }

  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
