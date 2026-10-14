import { describe, expect, it } from "vitest";
import { openExcerpt, sealExcerpt } from "../src/redaction/hold";
import { applyRules, markerSequence } from "../src/redaction/rules";
import { parseCv, UnreadableCvError } from "../src/redaction/parse";
import { deleteOriginal, excerptHash, extractAndRedact } from "../src/redaction/pipeline";
import { cvDocx, cvPdf } from "./fixtures";
import { fakeSupabase } from "./fake-supabase";

const CANDIDATE = "cand-1";
const KEY = "test-key";
const SEAL_KEY = Buffer.alloc(32, 7);

// Stands in for the model step: flags exactly what a correct run would.
const flagSensitive = async (text: string) => [
  { category: "health", text: "I have type 1 diabetes, which is well managed." },
  { category: "ethnicity", text: "As a proud Maori woman I bring cultural insight to every team." },
].filter((s) => text.includes(s.text));

async function runPipeline(bytes: Uint8Array, ext: string) {
  const path = `${CANDIDATE}/cv.${ext}`;
  const files = new Map([[path, bytes]]);
  const { client, tables } = fakeSupabase(files);
  tables.uploads!.push({ id: "up-1", candidate_id: CANDIDATE, storage_path: path, status: "received" });
  const result = await extractAndRedact({ db: client, flagSensitive, hashKey: KEY, seal: (p) => sealExcerpt(p, SEAL_KEY) }, CANDIDATE, "up-1");
  await deleteOriginal(client, CANDIDATE, "up-1");
  return { result, tables, files, path };
}

describe.each([["pdf", cvPdf], ["docx", cvDocx]] as const)("AT-01 with a %s CV", (ext, make) => {
  it("leaves no photo, date of birth, health line or ethnicity statement in cv_text, logs each, and deletes the original", async () => {
    const { result, tables, files, path } = await runPipeline(await make(), ext);
    expect(result.outcome).toBe("redacted");

    const text = String(tables.cv_text![0]!.redacted_text);
    for (const gone of ["12 March 1985", "Female", "New Zealander", "diabetes", "Maori"]) expect(text).not.toContain(gone);
    // Job titles and achievements survive.
    expect(text).toContain("Health and Safety Coordinator");
    expect(text).toContain("Cut lost-time injuries from 14 to 3 a year");

    const categories = tables.redaction_log!.map((l) => l.category);
    for (const c of ["photo", "date_of_birth", "gender", "nationality", "health", "ethnicity"]) expect(categories).toContain(c);
    // The log never holds the removed text, only a keyed hash of it.
    const log = JSON.stringify(tables.redaction_log);
    expect(log).not.toContain("1985");
    expect(log).not.toContain("diabetes");
    expect(tables.redaction_log!.some((l) => l.excerpt_hash === excerptHash(KEY, "Date of Birth: 12 March 1985"))).toBe(true);

    expect(files.has(path)).toBe(false);
    expect(tables.uploads![0]!.deleted_at).toBeTruthy();
    expect(tables.uploads![0]!.status).toBe("redacted");
  });

  it("holds each removed line encrypted for restore, but never the photo (D-27)", async () => {
    const { tables } = await runPipeline(await make(), ext);
    const textRemovals = tables.redaction_log!.filter((l) => l.category !== "photo");
    expect(tables.redaction_holds).toHaveLength(textRemovals.length);
    const holds = JSON.stringify(tables.redaction_holds);
    expect(holds).not.toContain("diabetes");
    const health = tables.redaction_log!.find((l) => l.category === "health")!;
    const hold = tables.redaction_holds!.find((h) => h.redaction_log_id === health.id)!;
    expect(openExcerpt(String(hold.ciphertext), SEAL_KEY)).toBe("I have type 1 diabetes, which is well managed.");
    // The marker sits where the line was, so a restore puts it back in place.
    expect(String(tables.cv_text![0]!.redacted_text)).toContain(String(health.marker));
  });
});

describe("AT-02", () => {
  it.each([["pdf", cvPdf], ["docx", cvDocx]] as const)("parses a %s CV", async (format, make) => {
    const parsed = await parseCv(await make(false), format);
    expect(parsed.text).toContain("Health and Safety Coordinator");
    expect(parsed.imageCount).toBe(0);
  });

  it.each(["pdf", "docx"] as const)("marks a corrupt %s as unreadable and still deletes it", async (ext) => {
    const { result, tables, files, path } = await runPipeline(new TextEncoder().encode("not really a CV"), ext);
    expect(result.outcome).toBe("unreadable");
    expect(tables.uploads![0]).toMatchObject({ status: "failed", failure_reason: "unreadable" });
    expect(tables.cv_text).toHaveLength(0);
    expect(files.has(path)).toBe(false);
  });

  it("rejects a file type it cannot read", async () => {
    const { result, tables } = await runPipeline(new Uint8Array([1, 2, 3]), "pages");
    expect(result.outcome).toBe("unsupported_type");
    expect(tables.uploads![0]).toMatchObject({ status: "failed", failure_reason: "unsupported_type" });
  });

  it("throws UnreadableCvError for an empty document", async () => {
    await expect(parseCv(new Uint8Array(), "pdf")).rejects.toBeInstanceOf(UnreadableCvError);
  });
});

describe("rules redaction", () => {
  it("removes labelled personal details", () => {
    const { text, removals } = applyRules("DOB: 01/02/1990\nAge: 34\nSex: M\nMarital status: Married\nCitizenship: British", markerSequence());
    expect(text).not.toMatch(/1990|34|Married|British|\bM\b/);
    expect(removals.map((r) => r.category).sort()).toEqual(["age", "date_of_birth", "gender", "marital_status", "nationality"]);
  });

  it("leaves job titles and ordinary sentences alone", () => {
    const input = "Gender Equity Programme Lead\nManaged a team aged between 20 and 60.\nBorn and raised in Dunedin.";
    expect(applyRules(input, markerSequence()).text).toBe(input);
  });
});
