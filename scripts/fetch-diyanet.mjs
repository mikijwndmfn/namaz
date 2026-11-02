// Lädt die offiziellen Diyanet-Jahrestabellen (namazvakitleri.diyanet.gov.tr)
// für feste Standorte und schreibt sie als JSON nach src/data/diyanet/.
// Einmal im Jahr ausführen: node scripts/fetch-diyanet.mjs
import { writeFile, mkdir, readFile } from "node:fs/promises";

const LOCATIONS = [
  { id: "nuernberg", diyanetId: 11024, slug: "nurnberg-prayer-times" },
  { id: "fuerth", diyanetId: 11081, slug: "furth-prayer-times" },
  { id: "istanbul", diyanetId: 9541, slug: "istanbul-prayer-times" },
];

const TIME = /^\d{2}:\d{2}$/;

function parseYearly(html) {
  // Die Seite enthält mehrere Tabellen (wöchentlich, monatlich, jährlich).
  // Wir sammeln alle Zeilen mit Datum + 6 Zeiten und deduplizieren nach Datum.
  const rows = new Map();
  const tr = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = tr.exec(html))) {
    const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) =>
      c[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()
    );
    if (cells.length < 8) continue;
    const d = cells[0].match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (!d) continue;
    const times = cells.slice(2, 8);
    if (!times.every((t) => TIME.test(t))) continue;
    const iso = `${d[3]}-${d[2]}-${d[1]}`;
    rows.set(iso, {
      date: iso,
      hijri: cells[1],
      imsak: times[0],
      gunes: times[1],
      ogle: times[2],
      ikindi: times[3],
      aksam: times[4],
      yatsi: times[5],
    });
  }
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
}

await mkdir(new URL("../src/data/diyanet/", import.meta.url), { recursive: true });
for (const loc of LOCATIONS) {
  const url = `https://namazvakitleri.diyanet.gov.tr/en-US/${loc.diyanetId}/${loc.slug}`;
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (private prayer-times app)" } });
  if (!res.ok) throw new Error(`${loc.id}: HTTP ${res.status}`);
  const fetched = parseYearly(await res.text());
  if (fetched.length < 300) throw new Error(`${loc.id}: nur ${fetched.length} Tage gefunden`);

  // Mit vorhandener Tabelle zusammenführen: Abdeckung wächst nur, neue Werte gewinnen.
  const file = new URL(`../src/data/diyanet/${loc.id}.json`, import.meta.url);
  const merged = new Map();
  try {
    const old = JSON.parse(await readFile(file, "utf8"));
    for (const d of old.days ?? []) merged.set(d.date, d);
  } catch { /* noch keine Datei */ }
  for (const d of fetched) merged.set(d.date, d);
  // Nur die letzten 2 Jahre behalten, damit die App nicht unnötig wächst
  const cutoff = new Date(Date.now() - 400 * 86400000).toISOString().slice(0, 10);
  const days = [...merged.values()].filter((d) => d.date >= cutoff).sort((a, b) => a.date.localeCompare(b.date));
  const out = {
    source: "diyanet",
    sourceUrl: url,
    diyanetId: loc.diyanetId,
    fetchedAt: new Date().toISOString(),
    from: days[0].date,
    to: days[days.length - 1].date,
    days,
  };
  await writeFile(file, JSON.stringify(out));
  console.log(`${loc.id}: ${fetched.length} geladen, ${days.length} gesamt, ${out.from} bis ${out.to}`);
}
