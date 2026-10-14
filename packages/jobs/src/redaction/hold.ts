import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

// D-27: removed text is held for 24 hours, encrypted with a key derived from the
// service secret, so the stored value is unreadable without the server.
function key(): Buffer {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secret) throw new Error("Supabase service credentials are not configured");
  return createHmac("sha256", secret).update("redaction_hold").digest();
}

export function sealExcerpt(plain: string, k: Buffer = key()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString("base64")).join(".");
}

export function openExcerpt(sealed: string, k: Buffer = key()): string {
  const [iv, tag, body] = sealed.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", k, iv!);
  decipher.setAuthTag(tag!);
  return Buffer.concat([decipher.update(body!), decipher.final()]).toString("utf8");
}
