<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { findLocation } from "../data/locations";
import { getDayTimes } from "../lib/providers";
import { currentPhase } from "../lib/phase";
import { formatRemaining, nextPrayer } from "../lib/prayer";
import { settings } from "../lib/settings";
import { speak, speechAvailable, speechText } from "../lib/speech";
import { isoDateInZone } from "../lib/tz";
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
const phase = computed(() => currentPhase(location.value, now.value, getDayTimes));
const next = computed(() => nextPrayer(location.value, now.value, getDayTimes));

const clock = computed(() =>
  new Intl.DateTimeFormat("tr-TR", { timeZone: location.value.tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now.value),
);
const dateText = computed(() =>
  new Intl.DateTimeFormat("tr-TR", { timeZone: location.value.tz, day: "numeric", month: "long", weekday: "long" }).format(now.value),
);

/** Countdown-Ziffern: Stunden und Minuten bis Phasenende */
const countdown = computed(() => {
  const m = phase.value.kind === "free" ? next.value.remainingMinutes : phase.value.remainingMinutes;
  return { h: String(Math.floor(m / 60)).padStart(2, "0"), m: String(m % 60).padStart(2, "0") };
});

const panelTitle = computed(() => {
  const p = phase.value;
  if (p.kind === "kerahat") return "Kerahat · namaz kılınmaz";
  if (p.kind === "free") return `${PRAYER_LABEL[p.nextPrayer]} vaktine`;
  return `${p.title} · vaktin çıkmasına`;
});
const panelFoot = computed(() => {
  const p = phase.value;
  if (p.kind === "prayer") return `Bitiş ${p.endTime}`;
  return `${PRAYER_LABEL[p.nextPrayer]} ${p.nextTime}`;
});

function tileState(key: PrayerKey): "passed" | "active" | "upcoming" {
  const p = phase.value;
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
      ? `${p.title} vakti. Vaktin çıkmasına ${formatRemaining(p.remainingMinutes)}. Bitiş saat ${p.endTime.replace(":", " ")}.`
      : p.kind === "kerahat"
        ? `Kerahat vakti, namaz kılınmaz. ${PRAYER_LABEL[p.nextPrayer]} saat ${p.nextTime.replace(":", " ")}.`
        : speechText(next.value);
  speaking.value = speak(text);
  window.setTimeout(() => (speaking.value = false), 3000);
}
</script>

<template>
  <main class="app" :data-phase="phase.kind" :class="{ urgent: phase.urgent }">
    <header class="head">
      <div class="head-left">
        <p class="place">{{ location.name.split(",")[0] }}</p>
        <p class="date">{{ dateText }}</p>
      </div>
      <p class="clock" aria-label="Şu an saat">{{ clock }}</p>
      <button class="gear" type="button" aria-label="Ayarlar" @click="$emit('open-settings')">⚙︎</button>
    </header>

    <component
      :is="canSpeak ? 'button' : 'section'"
      class="panel"
      :type="canSpeak ? 'button' : undefined"
      :aria-label="canSpeak ? 'Sesli oku' : undefined"
      @click="readAloud"
    >
      <span class="panel-title">{{ panelTitle }}</span>
      <span class="flip" aria-label="Kalan süre">
        <span class="digits"><span class="d">{{ countdown.h[0] }}</span><span class="d">{{ countdown.h[1] }}</span><span class="unit">Saat</span></span>
        <span class="colon">:</span>
        <span class="digits"><span class="d">{{ countdown.m[0] }}</span><span class="d">{{ countdown.m[1] }}</span><span class="unit">Dakika</span></span>
      </span>
      <span class="panel-foot">{{ panelFoot }}</span>
      <span class="bar" aria-hidden="true"><span class="fill" :style="{ width: Math.round(phase.progress * 100) + '%' }"></span></span>
    </component>

    <ul class="grid" aria-label="Bugünkü vakitler">
      <li v-for="key in PRAYER_ORDER" :key="key" :class="tileState(key)">
        <span class="name">{{ PRAYER_LABEL[key] }}<span v-if="tileState(key) === 'passed'" class="sr-only"> (geçti)</span></span>
        <span class="time">{{ day.times[key] }}</span>
      </li>
    </ul>

    <p v-if="calculated" class="notice" role="status">⚠︎ Hesaplanmış vakitler (resmi Diyanet tablosu yok)</p>
  </main>
</template>
