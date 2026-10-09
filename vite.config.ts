import { resolve } from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

let cloudflareClientAssetsDir: string | undefined;

const captureCloudflareClientAssetsDir: Plugin = {
  name: "capture-cloudflare-client-assets-dir",
  configResolved(config) {
    const clientBuild = config.environments.client?.build;
    if (!clientBuild)
      throw new Error("Cloudflare Vite plugin did not resolve a client build environment.");
    cloudflareClientAssetsDir = resolve(config.root, clientBuild.outDir);
  },
};

const cloudflarePlugins = cloudflare();

export default defineConfig({
  plugins: [
    react(),
    ...cloudflarePlugins,
    captureCloudflareClientAssetsDir,
    VitePWA({
      integration: {
        beforeBuildServiceWorker(options) {
          if (!cloudflareClientAssetsDir) {
            throw new Error("Cloudflare Vite plugin did not expose its client assets directory.");
          }

          const serviceWorkerPath = resolve(cloudflareClientAssetsDir, options.filename);
          options.outDir = cloudflareClientAssetsDir;
          options.swDest = serviceWorkerPath;
          options.workbox.globDirectory = cloudflareClientAssetsDir;
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
