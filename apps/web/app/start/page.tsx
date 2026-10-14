import { redirect } from "next/navigation";
import { hasConsented } from "@/lib/consent";
import { supabaseServer } from "@/lib/supabase/server";
import { DeleteData } from "./delete-data";
import { ScreenOne } from "./screen-one";

export default async function Start() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/sign-in");

  // Created automatically on first sign-in; readable only by this candidate.
  const { data: candidate } = await supabase.from("candidates").select("id, retention_until").maybeSingle();
  if (!candidate) redirect("/sign-in");

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 680, margin: "3rem auto", padding: "0 1rem", lineHeight: 1.5 }}>
      <h1>Where do I begin?</h1>
      <ScreenOne candidateId={data.user.id} consented={await hasConsented(supabase)} />

      <hr style={{ margin: "2rem 0" }} />
      <p>
        Signed in as {data.user.email}. We delete everything you give us on{" "}
        {new Date(candidate.retention_until).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })}.
      </p>
      <DeleteData />
      <form action="/auth/sign-out" method="post">
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
