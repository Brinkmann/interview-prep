import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

// Signed-in client for server components and route handlers. Acts as the candidate,
// so row-level security applies to every query. Create one per request.
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (toSet) => {
          // Server components cannot set cookies; the proxy refreshes the session instead.
          try {
            toSet.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {}
        },
      },
    },
  );
}
