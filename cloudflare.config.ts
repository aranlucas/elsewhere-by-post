import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "elsewhere-by-post",
    compatibilityDate: "2026-10-02",
    assets: {
      notFoundHandling: "single-page-application",
    },
  },
});
