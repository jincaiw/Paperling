import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const sourceDir = join(root, "src");
const localeFile = join(sourceDir, "context", "LocaleContext.tsx");

async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  }));
  return nested.flat();
}

const localeSource = await readFile(localeFile, "utf8");
const translated = new Set(
  [...localeSource.matchAll(/^\s{4}(["'])(.*?)\1:\s*(["']).*?\3,?$/gm)].map((match) => match[2]),
);
const sourceFiles = (await files(sourceDir)).filter((path) => /\.(?:ts|tsx)$/.test(path) && !path.endsWith(".test.ts") && !path.endsWith(".test.tsx"));
const missing = [];
const callPattern = /\b(?:t|tr)\(\s*(["'])(.*?)\1(?:\s*,|\s*\))/g;

for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(callPattern)) {
    const key = match[2];
    if (!translated.has(key)) {
      const line = source.slice(0, match.index).split("\n").length;
      missing.push(`${relative(root, file)}:${line}  ${JSON.stringify(key)}`);
    }
  }
}

if (missing.length) {
  console.error("Chinese translation keys missing from src/context/LocaleContext.tsx:\n" + missing.join("\n"));
  process.exit(1);
}

console.log(`i18n completeness passed: ${translated.size} Chinese keys cover ${sourceFiles.length} source files.`);
