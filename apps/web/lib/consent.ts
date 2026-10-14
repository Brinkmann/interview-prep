import type { SupabaseClient } from "@supabase/supabase-js";
import { NOTICE_VERSION } from "@/lib/privacy";

export async function hasConsented(supabase: SupabaseClient): Promise<boolean> {
  const { count } = await supabase.from("consents").select("id", { count: "exact", head: true }).eq("notice_version", NOTICE_VERSION);
  return Boolean(count);
}
