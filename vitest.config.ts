import { defineConfig } from "vitest/config";

// Kept apart from vite.config.ts so unit tests run in plain Node, without the
// Cloudflare runtime or the service-worker build.
export default defineConfig({
  test: {
    include: ["tests/*.test.ts"],
    environment: "node",
  },
});
