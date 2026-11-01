export type PrayerKey = "imsak" | "gunes" | "ogle" | "ikindi" | "aksam" | "yatsi";

export const PRAYER_ORDER: PrayerKey[] = ["imsak", "gunes", "ogle", "ikindi", "aksam", "yatsi"];

export const PRAYER_LABEL: Record<PrayerKey, string> = {
  imsak: "İmsak",
  gunes: "Güneş",
  ogle: "Öğle",
  ikindi: "İkindi",
  aksam: "Akşam",
  yatsi: "Yatsı",
};

/** Zusatzhinweis für die große Anzeige (Güneş ist kein Pflichtgebet). */
export const PRAYER_HINT: Partial<Record<PrayerKey, string>> = {
  gunes: "Sabah namazının sonu",
};

export type DataSource = "diyanet" | "hesaplama";

export interface DayTimes {
  /** ISO-Datum YYYY-MM-DD in der Zeitzone des Standorts */
  date: string;
  hijri?: string;
  times: Record<PrayerKey, string>; // "HH:MM" lokale Zeit des Standorts
  source: DataSource;
}

export interface Location {
  id: string;
  /** Anzeige, z. B. "Nürnberg, Almanya" */
  name: string;
  lat: number;
  lon: number;
  tz: string;
  /** Diyanet-Tabellen vorhanden? */
  hasDiyanet: boolean;
}

export interface NextPrayer {
  key: PrayerKey;
  /** Datum, an dem dieses Gebet stattfindet */
  date: string;
  time: string;
  at: Date;
  remainingMinutes: number;
  source: DataSource;
}
