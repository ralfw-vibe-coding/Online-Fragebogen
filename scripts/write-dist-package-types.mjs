import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();

const files = [
  {
    dir: path.join(rootDir, "apps/server/dist"),
    contents: { type: "commonjs" }
  },
  {
    dir: path.join(rootDir, "packages/shared/dist"),
    contents: { type: "commonjs" }
  },
  {
    dir: path.join(rootDir, "packages/shared/dist/esm"),
    contents: { type: "module" }
  }
];

for (const file of files) {
  await mkdir(file.dir, { recursive: true });
  await writeFile(
    path.join(file.dir, "package.json"),
    `${JSON.stringify(file.contents, null, 2)}\n`,
    "utf8"
  );
}

