import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Google sign-in and the emailed sign-in link return here with a one-time code
// that is swapped for a session.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/start", url.origin));
  }
  return NextResponse.redirect(new URL("/sign-in?error=link", url.origin));
}
