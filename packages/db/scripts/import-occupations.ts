// Imports O*NET (text release, already unzipped into ONET_DIR) and English ESCO
// (from the ESCO API) into public.occupations. Run by the "Import occupations" workflow.
// Reference data only: no personal information.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

type Occupation = { scheme: "onet" | "esco"; code: string; title: string; description: string; tasks: string[]; skills: string[] };

function readTsv(path: string): Record<string, string>[] {
  const [header, ...lines] = readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean);
  const cols = header!.split("\t");
  return lines.map((l) => Object.fromEntries(l.split("\t").map((v, i) => [cols[i]!, v])));
}

export function loadOnet(dir: string): Occupation[] {
  const occ = readTsv(join(dir, "Occupation Data.txt"));
  const tasks = readTsv(join(dir, "Task Statements.txt"));
  const skills = readTsv(join(dir, "Skills.txt")).filter((r) => r["Scale ID"] === "IM");
  const byCode = new Map<string, Occupation>();
  for (const r of occ) {
    byCode.set(r["O*NET-SOC Code"]!, {
      scheme: "onet", code: r["O*NET-SOC Code"]!, title: r["Title"]!, description: r["Description"] ?? "", tasks: [], skills: [],
    });
  }
  for (const t of tasks) {
    const o = byCode.get(t["O*NET-SOC Code"]!);
    if (o && t["Task Type"] !== "Supplemental" && o.tasks.length < 15) o.tasks.push(t["Task"]!);
  }
  const ranked = new Map<string, { name: string; value: number }[]>();
  for (const s of skills) {
    const list = ranked.get(s["O*NET-SOC Code"]!) ?? [];
    list.push({ name: s["Element Name"]!, value: Number(s["Data Value"]) });
    ranked.set(s["O*NET-SOC Code"]!, list);
  }
  for (const [code, list] of ranked) {
    const o = byCode.get(code);
    if (o) o.skills = list.sort((a, b) => b.value - a.value).slice(0, 10).map((s) => s.name);
  }
  return [...byCode.values()];
}

const ESCO = "https://ec.europa.eu/esco/api";

async function getJson(url: string): Promise<any> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (res.ok) return res.json();
    if (attempt >= 4) throw new Error(`ESCO API ${res.status} for ${url}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

export async function loadEsco(): Promise<Occupation[]> {
  const uris: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await getJson(`${ESCO}/search?type=occupation&language=en&limit=100&offset=${offset}`);
    const results = page?._embedded?.results ?? [];
    uris.push(...results.map((r: { uri: string }) => r.uri));
    if (results.length < 100) break;
  }
  const out: Occupation[] = [];
  for (let i = 0; i < uris.length; i += 8) {
    const batch = await Promise.all(uris.slice(i, i + 8).map(async (uri) => {
      const o = await getJson(`${ESCO}/resource/occupation?uri=${encodeURIComponent(uri)}&language=en`);
      return {
        scheme: "esco" as const,
        code: uri.split("/").pop()!,
        title: o.preferredLabel?.en ?? o.title ?? "",
        // Alternative labels go into the searchable text so "software engineer" finds "software developer".
        description: [o.description?.en?.literal ?? "", ...(o.alternativeLabel?.en ?? [])].join(" "),
        tasks: [],
        skills: (o._links?.hasEssentialSkill ?? []).map((s: { title: string }) => s.title).slice(0, 20),
      };
    }));
    out.push(...batch.filter((o) => o.title));
  }
  return out;
}

async function main() {
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const sets: Occupation[][] = [];
  if (process.env.ONET_DIR) sets.push(loadOnet(process.env.ONET_DIR));
  if (process.env.IMPORT_ESCO === "true") sets.push(await loadEsco());
  for (const rows of sets) {
    for (const r of rows) {
      await db.query(
        `insert into public.occupations (scheme, code, title, description, tasks, skills) values ($1, $2, $3, $4, $5, $6)
         on conflict (scheme, code) do update set title = excluded.title, description = excluded.description,
           tasks = excluded.tasks, skills = excluded.skills`,
        [r.scheme, r.code, r.title, r.description, r.tasks, r.skills],
      );
    }
    console.log(`${rows[0]?.scheme ?? "none"}: ${rows.length} occupations`);
  }
  const { rows } = await db.query("select scheme, count(*)::int as n from public.occupations group by scheme order by scheme");
  console.log(JSON.stringify(rows));
  await db.end();
}

if (process.argv[1]?.endsWith("import-occupations.ts")) await main();

