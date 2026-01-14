import { strict as assert } from "node:assert";
import test from "node:test";
import { shouldTriggerPullRefresh } from "../src/events.js";

test("shouldTriggerPullRefresh requires a vertical pull at the top", () => {
  assert.equal(
    shouldTriggerPullRefresh({ deltaX: 10, deltaY: 60, scrollTop: 0 }),
    true
  );
  assert.equal(
    shouldTriggerPullRefresh({ deltaX: 0, deltaY: 40, scrollTop: 0 }),
    false
  );
  assert.equal(
    shouldTriggerPullRefresh({ deltaX: 20, deltaY: 30, scrollTop: 0 }),
    false
  );
  assert.equal(
    shouldTriggerPullRefresh({ deltaX: 0, deltaY: 70, scrollTop: 12 }),
    false
  );
  assert.equal(
    shouldTriggerPullRefresh({ deltaX: 0, deltaY: -20, scrollTop: 0 }),
    false
  );
});
