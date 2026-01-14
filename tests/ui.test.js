import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildSaveToastMessage, buildSettingsToastMessage } from "../src/ui.js";

test("buildSaveToastMessage formats save targets", () => {
  assert.equal(
    buildSaveToastMessage("inbox.org|Inbox"),
    "Saved to inbox.org · Inbox"
  );
  assert.equal(buildSaveToastMessage("notes.org"), "Saved to notes.org");
  assert.equal(buildSaveToastMessage(""), "Saved");
});

test("buildSettingsToastMessage defaults to generic copy", () => {
  assert.equal(buildSettingsToastMessage(), "Saved");
  assert.equal(buildSettingsToastMessage("Path depth"), "Path depth saved");
});

test("settings icon uses sliders glyph", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(html.includes("data-icon=\"settings-sliders\""));
});

test("settings check and submit icons are centered", async () => {
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(
    css,
    /\.modal__submit\s*\{[^}]*display:\s*inline-flex[^}]*align-items:\s*center[^}]*justify-content:\s*center/
  );
  assert.match(
    css,
    /\.settings-field__option-check\s*\{[^}]*position:\s*relative/
  );
  assert.match(
    css,
    /\.settings-field__option\.is-selected\s+\.settings-field__option-check::after\s*\{[^}]*left:\s*50%[^}]*top:\s*50%/
  );
  assert.match(
    css,
    /\.settings-field__option\.is-selected\s+\.settings-field__option-check::after\s*\{[^}]*width:\s*4px[^}]*height:\s*6px/
  );
});
