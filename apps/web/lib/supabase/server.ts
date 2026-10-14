import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Signed-in client for server components and route handlers. Acts as the candidate,
// so row-level security applies to every query. Create one per request.
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
