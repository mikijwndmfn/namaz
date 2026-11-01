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
const canSpeak = computed(() => settings.speech && speechAvailable());
const speaking = ref(false);
function readAloud() {
  if (!canSpeak.value) return;
  speaking.value = speak(speechText(next.value));
  window.setTimeout(() => (speaking.value = false), 3000);
}
</script>

<template>
  <main class="app">
    <header class="head">
      <div>
        <p class="date">{{ dateText }}</p>
        <p class="place">{{ location.name }}</p>
      </div>
      <button class="gear" type="button" aria-label="Ayarlar" @click="$emit('open-settings')">⚙︎</button>
    </header>

    <component
      :is="canSpeak ? 'button' : 'section'"
      class="hero"
      :type="canSpeak ? 'button' : undefined"
      :aria-label="canSpeak ? 'Bir sonraki vakti sesli oku' : undefined"
      @click="readAloud"
    >
      <span class="label">Bir sonraki vakit<template v-if="next.date !== today"> · yarın</template></span>
      <span class="name">{{ PRAYER_LABEL[next.key] }}</span>
      <span class="time">{{ next.time }}</span>
      <span class="remaining">{{ PRAYER_HINT[next.key] ? PRAYER_HINT[next.key] + " · " : "" }}Kalan {{ formatRemaining(next.remainingMinutes) }}</span>
      <span v-if="canSpeak" class="speak-hint">{{ speaking ? "Okunuyor…" : "🔊 Dokun, sesli oku" }}</span>
    </component>

    <ul class="list" aria-label="Bugünkü vakitler">
      <li v-for="key in PRAYER_ORDER" :key="key" :class="{ passed: isPassed(key), next: isNext(key) }">
        <span class="name">{{ PRAYER_LABEL[key] }}<span v-if="isPassed(key)" class="sr-only"> (geçti)</span></span>
        <span class="time">{{ day.times[key] }}</span>
      </li>
    </ul>

    <p v-if="calculated" class="notice" role="status">⚠︎ Hesaplanmış vakitler (resmi Diyanet tablosu yok)</p>
  </main>
</template>
