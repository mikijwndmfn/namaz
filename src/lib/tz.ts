/**
 * Zeitzonen-Helfer ohne externe Bibliothek.
 * Alle Gebetszeiten sind "Wanduhrzeiten" am Standort. Zum Vergleichen mit "jetzt"
 * rechnen wir sie über Intl in echte Zeitpunkte um; Sommer-/Winterzeit wird dabei
 * automatisch berücksichtigt.
 */

function partsInZone(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const { type, value } of f.formatToParts(d)) {
    if (type !== "literal") p[type] = Number(value);
  }
  return p;
}

/** Offset der Zone in Minuten zum Zeitpunkt d. */
export function offsetMinutes(d: Date, tz: string): number {
  const p = partsInZone(d, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - d.getTime()) / 60000);
}

/** Wanduhrzeit (Datum + HH:MM) in der Zone tz als echten Zeitpunkt. */
export function zonedDateTime(isoDate: string, hhmm: string, tz: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  let guess = Date.UTC(y, m - 1, d, h, mi, 0);
  // Zwei Iterationen reichen auch über DST-Grenzen hinweg.
  for (let i = 0; i < 2; i++) {
    guess = Date.UTC(y, m - 1, d, h, mi, 0) - offsetMinutes(new Date(guess), tz) * 60000;
  }
  return new Date(guess);
}

/** Datum (YYYY-MM-DD) eines Zeitpunkts in der Zone tz. */
export function isoDateInZone(d: Date, tz: string): string {
  const p = partsInZone(d, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

export function formatHHMM(d: Date, tz: string): string {
  const p = partsInZone(d, tz);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}
