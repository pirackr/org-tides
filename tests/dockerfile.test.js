import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Dockerfile uses nginx and exposes port 80", () => {
  const dockerfileUrl = new URL("../Dockerfile", import.meta.url);
  const contents = readFileSync(dockerfileUrl, "utf8");
  assert.match(contents, /^FROM\s+nginx:alpine/m);
  assert.match(contents, /^EXPOSE\s+80/m);
});
