<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { findLocation } from "../data/locations";
import { getDayTimes } from "../lib/providers";
import { nextPrayer, formatRemaining } from "../lib/prayer";
import { settings } from "../lib/settings";
import { speak, speechAvailable, speechText } from "../lib/speech";
import { isoDateInZone } from "../lib/tz";
import { PRAYER_HINT, PRAYER_LABEL, PRAYER_ORDER, type PrayerKey } from "../lib/types";

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
  timer = window.setInterval(tick, 15_000);
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
const next = computed(() => nextPrayer(location.value, now.value, getDayTimes));

const dateText = computed(() =>
  new Intl.DateTimeFormat("tr-TR", {
    timeZone: location.value.tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now.value),
);

function isPassed(key: PrayerKey): boolean {
  const idx = PRAYER_ORDER.indexOf(key);
  const nextIdx = next.value.date === today.value ? PRAYER_ORDER.indexOf(next.value.key) : PRAYER_ORDER.length;
  return idx < nextIdx;
}
function isNext(key: PrayerKey): boolean {
  return next.value.date === today.value && next.value.key === key;
}

const calculated = computed(() => day.value.source !== "diyanet" || next.value.source !== "diyanet");
const canSpeak = speechAvailable();
const spoken = ref(false);
function readAloud() {
  spoken.value = speak(speechText(next.value));
  window.setTimeout(() => (spoken.value = false), 4000);
}
</script>

<template>
  <main class="app" aria-live="polite">
    <header class="head">
      <p class="date">{{ dateText }}</p>
      <p v-if="day.hijri" class="hijri">{{ day.hijri }}</p>
      <p class="place" aria-label="Konum">{{ location.name }}</p>
    </header>

    <section class="hero" aria-labelledby="next-label">
      <p id="next-label" class="label">Bir sonraki vakit</p>
      <p class="name">{{ PRAYER_LABEL[next.key] }}</p>
      <p class="time" aria-label="Saat">{{ next.time }}</p>
      <p v-if="PRAYER_HINT[next.key]" class="hint">{{ PRAYER_HINT[next.key] }}</p>
      <p class="remaining">Kalan: {{ formatRemaining(next.remainingMinutes) }}</p>
      <p v-if="next.date !== today" class="hint">Yarın</p>
    </section>

    <ul class="list" aria-label="Bugünkü vakitler">
      <li v-for="key in PRAYER_ORDER" :key="key" :class="{ passed: isPassed(key), next: isNext(key) }">
        <span class="name">{{ PRAYER_LABEL[key] }}<span v-if="isPassed(key)" class="sr-only"> (geçti)</span></span>
        <span class="time">{{ day.times[key] }}</span>
      </li>
    </ul>

    <p v-if="calculated" class="notice" role="status">
      Dikkat: Bu gün için resmi Diyanet tablosu yok. Vakitler cihazda hesaplandı ve birkaç dakika farklı olabilir.
    </p>

    <button v-if="settings.speech && canSpeak" class="big-btn" type="button" @click="readAloud">
      {{ spoken ? "Okunuyor…" : "🔊 Sesli oku" }}
    </button>

    <button class="settings-link" type="button" @click="$emit('open-settings')">⚙︎ Ayarlar</button>
  </main>
</template>
