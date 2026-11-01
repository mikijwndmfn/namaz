import type { NextPrayer } from "./types";
import { PRAYER_LABEL } from "./types";

const ONES = ["", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"];
const TENS = ["", "on", "yirmi", "otuz", "kırk", "elli"];

export function turkishNumber(n: number): string {
  if (n === 0) return "sıfır";
  const t = Math.floor(n / 10);
  const o = n % 10;
  return [TENS[t], ONES[o]].filter(Boolean).join(" ");
}

export function speechText(next: NextPrayer): string {
  const [h, m] = next.time.split(":").map(Number);
  const minutes = m === 0 ? "" : ` ${turkishNumber(m)}`;
  return `Bir sonraki vakit ${PRAYER_LABEL[next.key]}. Saat ${turkishNumber(h)}${minutes}.`;
}

export function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

/** Nur nach Nutzerinteraktion aufrufen (iOS blockiert sonst). */
export function speak(text: string): boolean {
  if (!speechAvailable()) return false;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "tr-TR";
    u.rate = 0.85;
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("tr"));
    if (voice) u.voice = voice;
    synth.speak(u);
    return true;
  } catch {
    return false;
  }
}
