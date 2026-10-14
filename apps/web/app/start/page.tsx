import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { UploadCv } from "./upload-cv";

// Screen 1 (Start) is built in Phase 1. For now this proves sign-in end to end.
export default async function Start() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in");

  // Created automatically on first sign-in; readable only by this candidate.
  const { data: candidate } = await supabase.from("candidates").select("id").maybeSingle();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 640, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>You are signed in</h1>
      <p>Signed in as {data.user.email}.</p>
      <p>{candidate ? "Your candidate record is ready." : "Your candidate record is missing."}</p>
      {candidate && <UploadCv candidateId={data.user.id} />}
      <form action="/auth/sign-out" method="post">
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
