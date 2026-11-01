import { reactive, watch } from "vue";
import { HOME_LOCATION_ID } from "../data/locations";

export type Theme = "light" | "dark" | "system";
export type FontScale = 1 | 2 | 3;

export interface Settings {
  locationId: string;
  theme: Theme;
  highContrast: boolean;
  fontScale: FontScale;
  speech: boolean;
}

const KEY = "namaz.settings.v1";

const defaults: Settings = {
  locationId: HOME_LOCATION_ID,
  theme: "light",
  highContrast: false,
  fontScale: 2,
  speech: true,
};

export function loadSettings(storage: Storage | null = safeStorage()): Settings {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw);
    return { ...defaults, ...sanitize(parsed) };
  } catch {
    return { ...defaults };
  }
}

function sanitize(p: Partial<Settings>): Partial<Settings> {
  const out: Partial<Settings> = {};
  if (typeof p.locationId === "string") out.locationId = p.locationId;
  if (p.theme === "light" || p.theme === "dark" || p.theme === "system") out.theme = p.theme;
  if (typeof p.highContrast === "boolean") out.highContrast = p.highContrast;
  if (p.fontScale === 1 || p.fontScale === 2 || p.fontScale === 3) out.fontScale = p.fontScale;
  if (typeof p.speech === "boolean") out.speech = p.speech;
  return out;
}

export function saveSettings(s: Settings, storage: Storage | null = safeStorage()) {
  try {
    storage?.setItem(KEY, JSON.stringify(s));
  } catch {
    /* Speicher voll oder privat: Einstellungen gelten dann nur für diese Sitzung */
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export const settings = reactive<Settings>(loadSettings());
watch(settings, (s) => saveSettings(s), { deep: true });
