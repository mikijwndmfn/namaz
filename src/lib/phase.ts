import type { Location, PrayerKey } from "./types";
import { PRAYER_LABEL } from "./types";
import type { DayProvider } from "./prayer";
import { addDays, isoDateInZone, zonedDateTime } from "./tz";

/**
 * Tagesphasen aus Sicht der Nutzerin: Welches Gebet läuft gerade, bis wann,
 * und darf man gerade beten?
 *
 * Kerahat-Zeiten (Diyanet-Praxis, in Minuten):
 *  - nach Sonnenaufgang 45 Min.
 *  - vor Öğle 10 Min. (istiva)
 *  - vor Akşam 45 Min.
 */
export const KERAHAT = { afterSunrise: 45, beforeDhuhr: 10, beforeMaghrib: 45 } as const;

export type PhaseKind = "prayer" | "free" | "kerahat";

export interface Phase {
  kind: PhaseKind;
  /** Gebet, dessen Fenster läuft (bei "prayer"), oder dessen Fenster als Nächstes beginnt */
  prayer: PrayerKey;
  /** Türkischer Titel für die große Fläche */
  title: string;
  /** Beginn und Ende der Phase */
  start: Date;
  end: Date;
  /** Minuten bis zum Ende der Phase (aufgerundet) */
  remainingMinutes: number;
  /** 0..1, wie viel der Phase schon vorbei ist */
  progress: number;
  /** Uhrzeit des Phasenendes als HH:MM (Wanduhr des Standorts) */
  endTime: string;
  /** Welches Gebet (Pflicht) beginnt als Nächstes und wann */
  nextPrayer: PrayerKey;
  nextStart: Date;
  nextTime: string;
  /** Läuft das Fenster in weniger als 30 Minuten ab? */
  urgent: boolean;
}

const PRAYER_WINDOW_END: Record<Exclude<PrayerKey, "gunes">, PrayerKey | "imsakTomorrow"> = {
  imsak: "gunes",
  ogle: "ikindi",
  ikindi: "aksam",
  aksam: "yatsi",
  yatsi: "imsakTomorrow",
};

function hhmm(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return f.format(d);
}

export function currentPhase(loc: Location, now: Date, provider: DayProvider): Phase {
  const today = isoDateInZone(now, loc.tz);
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const T = provider(loc, today).times;
  const at = (date: string, t: string) => zonedDateTime(date, t, loc.tz);

  const imsak = at(today, T.imsak);
  const gunes = at(today, T.gunes);
  const ogle = at(today, T.ogle);
  const ikindi = at(today, T.ikindi);
  const aksam = at(today, T.aksam);
  const yatsi = at(today, T.yatsi);
  const imsakTomorrow = at(tomorrow, provider(loc, tomorrow).times.imsak);
  const yatsiYesterday = at(yesterday, provider(loc, yesterday).times.yatsi);

  const min = (m: number) => m * 60000;
  const t = now.getTime();

  const build = (
    kind: PhaseKind,
    prayer: PrayerKey,
    start: Date,
    end: Date,
    nextPrayer: PrayerKey,
    nextStart: Date,
  ): Phase => {
    const remaining = Math.max(0, Math.ceil((end.getTime() - t) / 60000));
    const total = end.getTime() - start.getTime();
    const progress = total > 0 ? Math.min(1, Math.max(0, (t - start.getTime()) / total)) : 1;
    const title =
      kind === "prayer" ? PRAYER_LABEL[prayer === "imsak" ? "imsak" : prayer] :
      kind === "kerahat" ? "Kerahat vakti" :
      `${PRAYER_LABEL[nextPrayer]} bekleniyor`;
    return {
      kind,
      prayer,
      title: kind === "prayer" && prayer === "imsak" ? "Sabah" : title,
      start,
      end,
      remainingMinutes: remaining,
      progress,
      endTime: hhmm(end, loc.tz),
      nextPrayer,
      nextStart,
      nextTime: hhmm(nextStart, loc.tz),
      urgent: kind === "prayer" && remaining <= 30,
    };
  };

  // Vor İmsak: Yatsı von gestern läuft noch
  if (t < imsak.getTime()) return build("prayer", "yatsi", yatsiYesterday, imsak, "imsak", imsak);
  // Sabah
  if (t < gunes.getTime()) return build("prayer", "imsak", imsak, gunes, "ogle", ogle);
  // Kerahat nach Sonnenaufgang
  const k1End = new Date(gunes.getTime() + min(KERAHAT.afterSunrise));
  if (t < k1End.getTime()) return build("kerahat", "gunes", gunes, k1End, "ogle", ogle);
  // Freie Zeit bis istiva
  const k2Start = new Date(ogle.getTime() - min(KERAHAT.beforeDhuhr));
  if (t < k2Start.getTime()) return build("free", "gunes", k1End, k2Start, "ogle", ogle);
  // Kerahat istiva
  if (t < ogle.getTime()) return build("kerahat", "gunes", k2Start, ogle, "ogle", ogle);
  // Öğle
  if (t < ikindi.getTime()) return build("prayer", "ogle", ogle, ikindi, "ikindi", ikindi);
  // İkindi bis Kerahat vor Akşam
  const k3Start = new Date(aksam.getTime() - min(KERAHAT.beforeMaghrib));
  if (t < k3Start.getTime()) return build("prayer", "ikindi", ikindi, k3Start, "aksam", aksam);
  // Kerahat vor Akşam (İkindi zählt noch als Fenster, aber kerahat)
  if (t < aksam.getTime()) return build("kerahat", "ikindi", k3Start, aksam, "aksam", aksam);
  // Akşam
  if (t < yatsi.getTime()) return build("prayer", "aksam", aksam, yatsi, "yatsi", yatsi);
  // Yatsı bis İmsak morgen
  return build("prayer", "yatsi", yatsi, imsakTomorrow, "imsak", imsakTomorrow);
}

/** Phasen-Fenster eines Gebets in der Liste: Ende als HH:MM */
export function windowEnd(key: PrayerKey, times: Record<PrayerKey, string>, imsakTomorrow: string): string | null {
  if (key === "gunes") return null;
  const end = PRAYER_WINDOW_END[key];
  return end === "imsakTomorrow" ? imsakTomorrow : times[end];
}
