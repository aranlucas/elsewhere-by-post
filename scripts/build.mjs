import { cp, mkdir, readdir, readFile, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));

const destination = path.join(root, "dist");

await rm(destination, { recursive: true, force: true });

await mkdir(destination, { recursive: true });

await cp(path.join(root, "index.html"), path.join(destination, "index.html"));

await cp(path.join(root, "maker.html"), path.join(destination, "maker.html"));

await cp(path.join(root, "src"), path.join(destination, "src"), {
  recursive: true,
});

await cp(path.join(root, "public"), destination, { recursive: true });

const files = [
  "index.html",
  "maker.html",
  ...(await readdir(path.join(root, "src"))).map((file) => `src/${file}`),
];

const hash = createHash("sha256");

for (const file of files) hash.update(await readFile(path.join(root, file)));

const revision = hash.digest("hex").slice(0, 12);

const swPath = path.join(destination, "sw.js");

await writeFile(
  swPath,
  (await readFile(swPath, "utf8")).replace(
    "elsewhere-post-v1",
    `elsewhere-post-${revision}`,
  ),
);

process.stdout.write(
  `Built ${files.length + 4} static files. Offline revision ${revision}. No runtime dependencies.\n`,
);
