<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { findLocation } from "../data/locations";
import { getDayTimes } from "../lib/providers";
import { currentPhase } from "../lib/phase";
import { formatRemaining, nextPrayer } from "../lib/prayer";
import { settings } from "../lib/settings";
import { speak, speechAvailable, speechText } from "../lib/speech";
import { addDays, isoDateInZone } from "../lib/tz";
import { PRAYER_LABEL, PRAYER_ORDER, type PrayerKey } from "../lib/types";

defineEmits<{ (e: "open-settings"): void }>();

const now = ref(new Date());
let timer: number | undefined;
function tick() {
  now.value = new Date();
}
function onVisible() {
  if (document.visibilityState === "visible") tick();
}
onMounted(() => {
  timer = window.setInterval(tick, 10_000);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", tick);
  window.addEventListener("pageshow", tick);
});
onUnmounted(() => {
  window.clearInterval(timer);
  document.removeEventListener("visibilitychange", onVisible);
  window.removeEventListener("focus", tick);
  window.removeEventListener("pageshow", tick);
});

const location = computed(() => findLocation(settings.locationId));
const today = computed(() => isoDateInZone(now.value, location.value.tz));
const day = computed(() => getDayTimes(location.value, today.value));
const imsakTomorrow = computed(() => getDayTimes(location.value, addDays(today.value, 1)).times.imsak);
const phase = computed(() => currentPhase(location.value, now.value, getDayTimes));
const next = computed(() => nextPrayer(location.value, now.value, getDayTimes));

const clock = computed(() =>
  new Intl.DateTimeFormat("tr-TR", { timeZone: location.value.tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now.value),
);
const dateText = computed(() =>
  new Intl.DateTimeFormat("tr-TR", { timeZone: location.value.tz, weekday: "long", day: "numeric", month: "long" }).format(now.value),
);

/** Farbe der großen Fläche: pro Gebet fest, Kerahat rot, freie Zeit neutral. */
const heroTone = computed(() => {
  const p = phase.value;
  if (p.kind === "kerahat") return "kerahat";
  if (p.kind === "free") return "free";
  return p.prayer;
});

/** Welche Zeile ist "aktiv" (laufendes Fenster)? */
function rowState(key: PrayerKey): "passed" | "active" | "upcoming" {
  const p = phase.value;
  // Aktiv nur, wenn das laufende Fenster heute begonnen hat (Yatsı von gestern zählt nicht).
  if (p.kind === "prayer" && p.prayer === key && isoDateInZone(p.start, location.value.tz) === today.value) return "active";
  const idxNext = next.value.date === today.value ? PRAYER_ORDER.indexOf(next.value.key) : PRAYER_ORDER.length;
  return PRAYER_ORDER.indexOf(key) < idxNext ? "passed" : "upcoming";
}

const calculated = computed(() => day.value.source !== "diyanet");
const canSpeak = computed(() => settings.speech && speechAvailable());
const speaking = ref(false);
function readAloud() {
  if (!canSpeak.value) return;
  const p = phase.value;
  const text =
    p.kind === "prayer"
      ? `${p.title} vakti. Bitiş saat ${p.endTime.replace(":", " ")}. Kalan ${formatRemaining(p.remainingMinutes)}.`
      : p.kind === "kerahat"
        ? `Kerahat vakti, namaz kılınmaz. ${PRAYER_LABEL[p.nextPrayer]} saat ${p.nextTime.replace(":", " ")}.`
        : speechText(next.value);
  speaking.value = speak(text);
  window.setTimeout(() => (speaking.value = false), 3000);
}
</script>

<template>
  <main class="app" :data-tone="heroTone">
    <header class="head">
      <div class="head-left">
        <p class="date">{{ dateText }}</p>
        <p class="place">{{ location.name.split(",")[0] }}</p>
      </div>
      <p class="clock" aria-label="Şu an saat">{{ clock }}</p>
      <button class="gear" type="button" aria-label="Ayarlar" @click="$emit('open-settings')">⚙︎</button>
    </header>

    <component
      :is="canSpeak ? 'button' : 'section'"
      class="hero"
      :class="{ urgent: phase.urgent }"
      :type="canSpeak ? 'button' : undefined"
      :aria-label="canSpeak ? 'Sesli oku' : undefined"
      @click="readAloud"
    >
      <template v-if="phase.kind === 'prayer'">
        <span class="label">Şu an</span>
        <span class="name">{{ phase.title }}</span>
        <span class="time">{{ phase.endTime }}</span>
        <span class="sub">Bitiş · Kalan {{ formatRemaining(phase.remainingMinutes) }}</span>
      </template>
      <template v-else-if="phase.kind === 'kerahat'">
        <span class="label">Kerahat vakti</span>
        <span class="name">Namaz kılınmaz</span>
        <span class="time">{{ phase.nextTime }}</span>
        <span class="sub">{{ PRAYER_LABEL[phase.nextPrayer] }} · {{ formatRemaining(phase.remainingMinutes) }} sonra</span>
      </template>
      <template v-else>
        <span class="label">Bir sonraki vakit</span>
        <span class="name">{{ PRAYER_LABEL[phase.nextPrayer] }}</span>
        <span class="time">{{ phase.nextTime }}</span>
        <span class="sub">Kalan {{ formatRemaining(next.remainingMinutes) }}</span>
      </template>
      <span class="bar" aria-hidden="true"><span class="fill" :style="{ width: Math.round(phase.progress * 100) + '%' }"></span></span>
    </component>

    <ul class="list" aria-label="Bugünkü vakitler">
      <li v-for="key in PRAYER_ORDER" :key="key" :class="rowState(key)" :data-prayer="key">
        <span class="dot" aria-hidden="true"></span>
        <span class="name">{{ PRAYER_LABEL[key] }}<span v-if="rowState(key) === 'passed'" class="sr-only"> (geçti)</span></span>
        <span class="time">{{ day.times[key] }}</span>
      </li>
    </ul>

    <p v-if="calculated" class="notice" role="status">⚠︎ Hesaplanmış vakitler (resmi Diyanet tablosu yok)</p>
  </main>
</template>
