// Values pasted into Vercel can pick up stray line breaks or spaces. Browsers reject
// those in request headers, so every Supabase setting is trimmed before use.
export const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
export const supabasePublishableKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
