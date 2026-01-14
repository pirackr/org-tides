import { strict as assert } from "node:assert";
import test from "node:test";
import {
  buildHeadlineSelection,
  normalizeScheduled,
  mapHeadlinesToItems,
  slugify,
  buildTaskContent,
  pickInsertAfterId,
  resolveGraphQLEndpoint,
} from "../src/data.js";

test("buildHeadlineSelection nests children", () => {
  const selection = buildHeadlineSelection(1);
  assert.ok(selection.includes("children"));
  assert.ok(selection.includes("id"));
  assert.ok(selection.includes("level"));
});

test("normalizeScheduled trims timestamp strings", () => {
  assert.equal(normalizeScheduled("2024-01-02 Tue"), "2024-01-02");
  assert.equal(normalizeScheduled(""), null);
  assert.equal(normalizeScheduled(null), null);
});

test("slugify mirrors backend behavior", () => {
  assert.equal(slugify("Hello World!"), "hello-world");
  assert.equal(slugify("  spaced  out "), "spaced--out");
});

test("mapHeadlinesToItems builds paths, tags, and schedule", () => {
  const headlines = [
    {
      id: "work",
      level: 1,
      title: "Work",
      todo: null,
      tags: ["work"],
      scheduled: null,
      children: [
        {
          id: "prep-report",
          level: 2,
          title: "Prep report",
          todo: "TODO",
          tags: ["urgent"],
          scheduled: "2024-01-02 Tue",
          children: [],
        },
      ],
    },
  ];

  const items = mapHeadlinesToItems(headlines);
  assert.equal(items.length, 2);

  const [parent, child] = items;
  assert.deepEqual(parent.path, ["Inbox"]);
  assert.deepEqual(child.path, ["Work"]);
  assert.deepEqual(child.tags, ["work", "urgent", "Work"]);
  assert.equal(child.scheduled, "2024-01-02");
  assert.deepEqual(child.timestamps, ["2024-01-02"]);
  assert.equal(child.isTask, true);
});

test("buildTaskContent renders org heading content", () => {
  const content = buildTaskContent({
    title: "Launch plan",
    status: "TODO",
    date: "2024-01-02",
  });
  assert.equal(content, "* TODO Launch plan\nSCHEDULED: <2024-01-02>\n");
});

test("pickInsertAfterId prefers last top-level headline", () => {
  const items = [
    { id: "a", level: 1 },
    { id: "b", level: 2 },
    { id: "c", level: 1 },
  ];
  assert.equal(pickInsertAfterId(items), "c");
  assert.equal(pickInsertAfterId([{ id: "x", level: 2 }]), "x");
  assert.equal(pickInsertAfterId([]), null);
});

const withWindow = (nextWindow, fn) => {
  const previousWindow = globalThis.window;
  globalThis.window = nextWindow;
  try {
    fn();
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
};

test("resolveGraphQLEndpoint uses localhost for local dev", () => {
  withWindow(
    { location: { hostname: "localhost", origin: "http://localhost:8000" } },
    () => {
      assert.equal(resolveGraphQLEndpoint(), "http://localhost:8080/");
    }
  );
});

test("resolveGraphQLEndpoint derives origin in prod", () => {
  withWindow(
    { location: { hostname: "tides.example", origin: "https://tides.example" } },
    () => {
      assert.equal(resolveGraphQLEndpoint(), "https://tides.example/");
    }
  );
});
