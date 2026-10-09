import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const cloudflareAssetsDir = ".cloudflare/output/v0/workers/default/assets";

export default defineConfig({
  plugins: [
    react(),
    cloudflare(),
    VitePWA({
      // The Cloudflare plugin writes the client build here instead of Vite's default dist/.
      outDir: cloudflareAssetsDir,
      // `src/offline.ts` registers the worker, so no inline script is injected (CSP: script-src 'self').
      injectRegister: false,
      registerType: "autoUpdate",
      // `public/manifest.webmanifest` is served as-is.
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{html,js,css,svg,webmanifest}"],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        // Take over the open page on first visit so it keeps working offline.
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
});
