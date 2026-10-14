import type { OxfmtConfig } from "oxfmt";
import base from "@aranlucas/oxforge/format-config";

const sharedConfig: OxfmtConfig = base;

const config: OxfmtConfig = {
  ...sharedConfig,
  ignorePatterns: [...(sharedConfig.ignorePatterns ?? []), "evidence/**"],
};

export default config;
