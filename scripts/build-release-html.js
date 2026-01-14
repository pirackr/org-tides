import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const replaceOrThrow = (source, pattern, replacement, label) => {
  const updated = source.replace(pattern, replacement);
  if (updated === source) {
    throw new Error(`Missing ${label} in index.html`);
  }
  return updated;
};

export const buildReleaseHtml = (html) => {
  let output = html;
  output = replaceOrThrow(
    output,
    /href="styles\.css"/,
    "href=\"styles.min.css\"",
    "styles.css reference"
  );
  output = replaceOrThrow(
    output,
    /src="src\/app\.js"/,
    "src=\"app.min.js\"",
    "src/app.js reference"
  );
  return output;
};

const run = async () => {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (!inputPath || !outputPath) {
    throw new Error("Usage: node scripts/build-release-html.js <src> <dest>");
  }

  const html = await readFile(inputPath, "utf8");
  const output = buildReleaseHtml(html);
  await writeFile(outputPath, output, "utf8");
};

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] === modulePath) {
  run();
}
