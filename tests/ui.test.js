import { strict as assert } from "node:assert";
import test from "node:test";
import { buildSaveToastMessage } from "../src/ui.js";

test("buildSaveToastMessage formats save targets", () => {
  assert.equal(
    buildSaveToastMessage("inbox.org|Inbox"),
    "Saved to inbox.org · Inbox"
  );
  assert.equal(buildSaveToastMessage("notes.org"), "Saved to notes.org");
  assert.equal(buildSaveToastMessage(""), "Saved");
});
