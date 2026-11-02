import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

// BASE_PATH wird vom GitHub-Pages-Workflow auf "/<repo>/" gesetzt.
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "apple-touch-icon-v2.png"],
      manifest: {
        name: "Namaz Vakitleri",
        short_name: "Namaz",
        description: "Büyük yazılı namaz vakitleri",
        lang: "tr",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#15302f",
        theme_color: "#15302f",
        icons: [
          { src: "icon-192-v2.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512-v2.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512-v2.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,json,woff2}"],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  test: {
    environment: "jsdom",
  },
} as Parameters<typeof defineConfig>[0]);
