import { strict as assert } from "node:assert";
import test from "node:test";
import { findCloseSettingsTarget, setPathDepthSelection } from "../src/settings.js";

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

const createOption = (value) => {
  const classes = new Set();
  const option = {
    dataset: { pathDepth: value },
    attributes: {},
    classList: {
      toggle: (name, force) => {
        if (force) {
          classes.add(name);
        } else {
          classes.delete(name);
        }
      },
      contains: (name) => classes.has(name),
    },
    setAttribute: (name, valueToSet) => {
      option.attributes[name] = valueToSet;
    },
    tabIndex: -1,
  };
  return option;
};

test("setPathDepthSelection selects the matching option", () => {
  const options = [createOption("all"), createOption("1"), createOption("2")];
  const container = { querySelectorAll: () => options };

  const selected = setPathDepthSelection(container, "2");

  assert.equal(selected, "2");
  assert.equal(options[2].classList.contains("is-selected"), true);
  assert.equal(options[2].attributes["aria-checked"], "true");
  assert.equal(options[2].tabIndex, 0);
  assert.equal(options[0].tabIndex, -1);
});

test("setPathDepthSelection falls back to the first option when missing", () => {
  const options = [createOption("all"), createOption("1")];
  const container = { querySelectorAll: () => options };

  const selected = setPathDepthSelection(container, "4");

  assert.equal(selected, "all");
  assert.equal(options[0].classList.contains("is-selected"), true);
});
