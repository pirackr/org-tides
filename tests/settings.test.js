import { strict as assert } from "node:assert";
import test from "node:test";
import { findCloseSettingsTarget } from "../src/settings.js";

test("findCloseSettingsTarget walks up to a close settings trigger", () => {
  const closeButton = { dataset: { closeSettings: "true" }, parentElement: null };
  const icon = { parentElement: closeButton };
  const path = { parentElement: icon };

  assert.equal(findCloseSettingsTarget(path), closeButton);
});

test("findCloseSettingsTarget returns null when missing", () => {
  const leaf = { parentElement: null };
  assert.equal(findCloseSettingsTarget(leaf), null);
  assert.equal(findCloseSettingsTarget(null), null);
});
