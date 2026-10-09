import { resolve } from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, type ResolvedConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

let resolvedViteConfig: ResolvedConfig | undefined;

export default defineConfig({
  plugins: [
    react(),
    cloudflare(),
    VitePWA({
      integration: {
        configureOptions(config) {
          resolvedViteConfig = config;
        },
        beforeBuildServiceWorker(options) {
          const clientAssetsDir = resolvedViteConfig?.environments.client?.build.outDir;
          if (!resolvedViteConfig || !clientAssetsDir)
            throw new Error("Cloudflare Vite plugin did not resolve the client assets directory.");

          // Cloudflare sets this output directory after VitePWA's config hook runs.
          const assetsDir = resolve(resolvedViteConfig.root, clientAssetsDir);
          const serviceWorkerPath = resolve(assetsDir, options.filename);
          options.outDir = assetsDir;
          options.swDest = serviceWorkerPath;
          options.workbox.globDirectory = assetsDir;
          options.workbox.swDest = serviceWorkerPath;
        },
      },
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
