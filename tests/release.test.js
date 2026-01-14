import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildReleaseHtml } from "../scripts/build-release-html.js";

test("buildReleaseHtml keeps latest markup and swaps minified assets", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const output = buildReleaseHtml(html);

  assert.ok(output.includes("id=\"settingsSheet\""));
  assert.ok(output.includes("id=\"pullIndicator\""));
  assert.match(output, /href="styles\.min\.css"/);
  assert.match(output, /src="app\.min\.js"/);
  assert.equal(output.includes("href=\"styles.css\""), false);
  assert.equal(output.includes("src=\"src/app.js\""), false);
});
