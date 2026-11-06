import type { E2EConfig } from "e2e";
import { web } from "@e2e-dev/web";

export default {
  tests: "journeys/**/*.e2e.ts",
  targets: [
    {
      name: "chromium",
      engine: web(),
      app: {
        url: "http://127.0.0.1:4188",
        command: {
          executable: "pnpm",
          args: [
            "exec",
            "vite",
            "preview",
            "--host",
            "127.0.0.1",
            "--port",
            "4188",
            "--strictPort",
          ],
          log: ".e2e/logs/app.log",
        },
      },
    },
  ],
  workers: 1,
  retries: 0,
  trace: "retain-on-failure",
  reporters: ["list", "junit"],
} satisfies E2EConfig;
