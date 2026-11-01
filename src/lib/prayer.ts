import type { DayTimes, Location, NextPrayer, PrayerKey } from "./types";
import { PRAYER_ORDER } from "./types";
import { addDays, isoDateInZone, zonedDateTime } from "./tz";

export type DayProvider = (loc: Location, isoDate: string) => DayTimes;

/**
 * Bestimmt das nächste Gebet relativ zu "now" in der Zeitzone des Standorts.
 * Funktioniert über Mitternacht: nach Yatsı ist das nächste Gebet das İmsak von morgen.
 * Güneş wird als Zeitpunkt mitgeführt (Ende der Sabah-Zeit), ist aber kein Pflichtgebet.
 */
export function nextPrayer(loc: Location, now: Date, provider: DayProvider): NextPrayer {
  const today = isoDateInZone(now, loc.tz);
  // Heute und morgen prüfen; mehr ist nie nötig.
  for (const date of [today, addDays(today, 1)]) {
    const day = provider(loc, date);
    for (const key of PRAYER_ORDER) {
      const at = zonedDateTime(date, day.times[key], loc.tz);
      if (at.getTime() > now.getTime()) {
        return {
          key,
          date,
          time: day.times[key],
          at,
          remainingMinutes: Math.ceil((at.getTime() - now.getTime()) / 60000),
          source: day.source,
        };
      }
    }
  }
  throw new Error("Kein nächstes Gebet gefunden");
}

/** Welche Gebetszeit läuft gerade (letzte vergangene)? */
export function currentPrayer(loc: Location, now: Date, provider: DayProvider): PrayerKey | null {
  const today = isoDateInZone(now, loc.tz);
  const day = provider(loc, today);
  let current: PrayerKey | null = null;
  for (const key of PRAYER_ORDER) {
    if (zonedDateTime(today, day.times[key], loc.tz).getTime() <= now.getTime()) current = key;
  }
  // Vor İmsak gilt noch das Yatsı von gestern.
  return current ?? "yatsi";
}

export function formatRemaining(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} dakika`;
  if (m === 0) return `${h} saat`;
  return `${h} saat ${m} dakika`;
}
