import { MAX_MAP_BYTES, parseMap } from "../custom-map.ts";
import type { PostcardMap } from "../custom-map.ts";

export function mapFileName(title: string): string {
  return `elsewhere-${title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .slice(0, 50)}.json`;
}

/** Saves the map as a JSON download. It holds the design only, never game progress. */
export function downloadMap(map: PostcardMap): void {
  const url = URL.createObjectURL(
    new Blob([`${JSON.stringify(map, null, 2)}\n`], { type: "application/json" }),
  );

  const link = document.createElement("a");
  link.href = url;
  link.download = mapFileName(map.title);
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/** Reads a chosen file as a map, or throws a player-facing Error. */
export async function readMapFile(file: File): Promise<PostcardMap> {
  if (file.size > MAX_MAP_BYTES)
    throw new Error("Choose a postcard JSON file smaller than 32 KiB.");

  return parseMap(await file.text());
}
