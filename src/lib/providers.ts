import { CalculationMethod, Coordinates, PrayerTimes } from "adhan";
import type { DayTimes, Location, PrayerKey } from "./types";
import { formatHHMM } from "./tz";
import nuernberg from "../data/diyanet/nuernberg.json";
import fuerth from "../data/diyanet/fuerth.json";
import istanbul from "../data/diyanet/istanbul.json";

interface DiyanetFile {
  source: "diyanet";
  fetchedAt: string;
  from: string;
  to: string;
  days: Array<{ date: string; hijri: string } & Record<PrayerKey, string>>;
}

const TABLES: Record<string, DiyanetFile> = {
  nuernberg: nuernberg as DiyanetFile,
  fuerth: fuerth as DiyanetFile,
  istanbul: istanbul as DiyanetFile,
};

const TIME = /^\d{2}:\d{2}$/;

/**
 * Offizielle Diyanet-Tabelle (eingebettet, offline). Liefert null, wenn für das
 * Datum keine Zeile vorhanden ist. Es werden nie Zeiten erfunden.
 */
export function fromDiyanet(loc: Location, isoDate: string): DayTimes | null {
  const table = TABLES[loc.id];
  if (!table) return null;
  const row = table.days.find((d) => d.date === isoDate);
  if (!row) return null;
  const keys: PrayerKey[] = ["imsak", "gunes", "ogle", "ikindi", "aksam", "yatsi"];
  const times = {} as Record<PrayerKey, string>;
  for (const k of keys) {
    if (!TIME.test(row[k])) return null; // beschädigte Zeile -> lieber Fallback
    times[k] = row[k];
  }
  return { date: isoDate, hijri: row.hijri, times, source: "diyanet" };
}

export function diyanetMeta(loc: Location) {
  const t = TABLES[loc.id];
  return t ? { fetchedAt: t.fetchedAt, from: t.from, to: t.to } : null;
}

/**
 * Lokale Berechnung mit adhan-js (Methode "Turkey", 18°/17°).
 * ACHTUNG: In Nürnberg weicht das im Sommer stark von Diyanet ab (kein astronomisches
 * Zwielicht), siehe README. Nur als deutlich gekennzeichneter Notfall-Fallback.
 */
export function fromAdhan(loc: Location, isoDate: string): DayTimes {
  const [y, m, d] = isoDate.split("-").map(Number);
  const params = CalculationMethod.Turkey();
  const pt = new PrayerTimes(new Coordinates(loc.lat, loc.lon), new Date(Date.UTC(y, m - 1, d, 12)), params);
  const f = (x: Date) => formatHHMM(x, loc.tz);
  return {
    date: isoDate,
    times: {
      imsak: f(pt.fajr),
      gunes: f(pt.sunrise),
      ogle: f(pt.dhuhr),
      ikindi: f(pt.asr),
      aksam: f(pt.maghrib),
      yatsi: f(pt.isha),
    },
    source: "hesaplama",
  };
}

/** Zentrale Abstraktion: erst Diyanet, sonst Berechnung. */
export function getDayTimes(loc: Location, isoDate: string): DayTimes {
  return fromDiyanet(loc, isoDate) ?? fromAdhan(loc, isoDate);
}
