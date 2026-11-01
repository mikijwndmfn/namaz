<script setup lang="ts">
import { computed } from "vue";
import { LOCATIONS, findLocation } from "../data/locations";
import { diyanetMeta } from "../lib/providers";
import { settings, type FontScale, type Theme } from "../lib/settings";
import { speechAvailable } from "../lib/speech";

defineEmits<{ (e: "close"): void }>();

const meta = computed(() => diyanetMeta(findLocation(settings.locationId)));
const canSpeak = speechAvailable();

const themes: Array<{ value: Theme; label: string }> = [
  { value: "light", label: "Açık (beyaz)" },
  { value: "dark", label: "Koyu (siyah)" },
  { value: "system", label: "Telefon ayarına göre" },
];
const fonts: Array<{ value: FontScale; label: string }> = [
  { value: 1, label: "Büyük" },
  { value: 2, label: "Çok büyük" },
  { value: 3, label: "En büyük" },
];

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}
</script>

<template>
  <main class="settings">
    <button class="big-btn" type="button" @click="$emit('close')">← Geri</button>
    <h1>Ayarlar</h1>

    <section aria-labelledby="s-loc">
      <h2 id="s-loc">Konum</h2>
      <div class="choice">
        <button
          v-for="l in LOCATIONS"
          :key="l.id"
          type="button"
          :aria-pressed="settings.locationId === l.id"
          @click="settings.locationId = l.id"
        >
          {{ l.name }}
        </button>
      </div>
    </section>

    <section aria-labelledby="s-font">
      <h2 id="s-font">Yazı boyutu</h2>
      <div class="choice">
        <button v-for="f in fonts" :key="f.value" type="button" :aria-pressed="settings.fontScale === f.value" @click="settings.fontScale = f.value">
          {{ f.label }}
        </button>
      </div>
    </section>

    <section aria-labelledby="s-theme">
      <h2 id="s-theme">Renk</h2>
      <div class="choice">
        <button v-for="t in themes" :key="t.value" type="button" :aria-pressed="settings.theme === t.value" @click="settings.theme = t.value">
          {{ t.label }}
        </button>
        <button type="button" :aria-pressed="settings.highContrast" @click="settings.highContrast = !settings.highContrast">
          Yüksek kontrast
        </button>
      </div>
    </section>

    <section v-if="canSpeak" aria-labelledby="s-speech">
      <h2 id="s-speech">Sesli okuma</h2>
      <div class="choice">
        <button type="button" :aria-pressed="settings.speech" @click="settings.speech = !settings.speech">
          "Sesli oku" düğmesini göster
        </button>
      </div>
    </section>

    <section aria-labelledby="s-data">
      <h2 id="s-data">Veri kaynağı</h2>
      <p v-if="meta" class="meta">
        Resmi Diyanet tablosu: {{ fmtDate(meta.from) }} – {{ fmtDate(meta.to) }}.<br />
        Güncelleme: {{ fmtDate(meta.fetchedAt) }}.<br />
        Tablo dışındaki günler cihazda hesaplanır ve işaretlenir.
      </p>
      <p v-else class="meta">Bu konum için Diyanet tablosu yok, vakitler cihazda hesaplanır.</p>
      <p class="meta">Uygulama internet olmadan da çalışır. Konum verisi telefondan dışarı gönderilmez.</p>
    </section>

    <button class="big-btn" type="button" @click="$emit('close')">← Geri</button>
  </main>
</template>
