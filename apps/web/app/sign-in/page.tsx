"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

// D-25: sign in with an emailed one-time code or with Google. No passwords.
// Until custom email sending is set up, Supabase's standard email carries a link rather
// than a code, so both are accepted; the link returns through /auth/callback.
export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"email" | "code">("email");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  useEffect(() => setDeleted(new URLSearchParams(window.location.search).has("deleted")), []);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) return setMessage(`We could not send a sign-in email to that address (${error.message}). Check it and try again.`);
    setStage("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const { error } = await supabaseBrowser().auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setBusy(false);
    if (error) return setMessage("That code did not work. It may have expired, so ask for a new one.");
    router.push("/start");
  }

  async function google() {
    await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 420, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>Sign in</h1>
      {deleted && (
        <p role="status">Your data is being deleted. This takes a few minutes and cannot be undone.</p>
      )}
      {stage === "email" ? (
        <form onSubmit={sendCode}>
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} style={{ display: "block", width: "100%", margin: "0.5rem 0 1rem" }} />
          <button type="submit" disabled={busy}>Email me a sign-in code</button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <p>We sent a sign-in email to {email}. Open the link in it on this device, or type the code if the email shows one.</p>
          <label htmlFor="code">Code</label>
          <input id="code" inputMode="numeric" autoComplete="one-time-code" required value={code}
            onChange={(e) => setCode(e.target.value)} style={{ display: "block", width: "100%", margin: "0.5rem 0 1rem" }} />
          <button type="submit" disabled={busy}>Sign in</button>{" "}
          <button type="button" onClick={() => setStage("email")}>Use a different email</button>
        </form>
      )}
      <p style={{ margin: "1.5rem 0" }}>or</p>
      <button type="button" onClick={google}>Continue with Google</button>
      {message && <p role="alert">{message}</p>}
    </main>
  );
}
