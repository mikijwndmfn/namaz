<script setup lang="ts">
import { ref, watchEffect } from "vue";
import MainView from "./components/MainView.vue";
import SettingsView from "./components/SettingsView.vue";
import { settings } from "./lib/settings";

const showSettings = ref(false);

// Theme, Kontrast und Schriftgröße als Attribute am <html>, damit die Tokens greifen.
watchEffect(() => {
  const root = document.documentElement;
  let theme = settings.theme;
  if (theme === "system") {
    theme = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  root.dataset.theme = theme;
  root.dataset.contrast = settings.highContrast ? "high" : "normal";
  root.dataset.font = String(settings.fontScale);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#000000" : "#ffffff");
});
</script>

<template>
  <SettingsView v-if="showSettings" @close="showSettings = false" />
  <MainView v-else @open-settings="showSettings = true" />
</template>
