import type { CSSProperties } from "react";

export type { CSSProperties };

declare module "react" {
  interface CSSProperties {
    "--columns"?: number;
    "--rows"?: number;
    "--courier-x"?: string;
    "--courier-y"?: string;
  }
}
