import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import { registerSW } from "virtual:pwa-register";

createApp(App).mount("#app");

// iOS Safari ignoriert user-scalable=no teilweise: Pinch- und Doppeltipp-Zoom zusätzlich per Script unterbinden.
document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
let lastTouch = 0;
document.addEventListener(
  "touchend",
  (e) => {
    const now = Date.now();
    if (now - lastTouch < 350) e.preventDefault();
    lastTouch = now;
  },
  { passive: false },
);

try {
  registerSW({ immediate: true });
} catch {
  /* z. B. in Vorschau-Umgebungen ohne Service-Worker-Unterstützung */
}
