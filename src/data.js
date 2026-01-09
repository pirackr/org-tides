import { STATUS_ORDER, state, viewConfig } from "./state.js";

export const ORG_FILE_PATHS = [
  "../org/todo.org",
  "../org/inbox.org",
  "../org/routines.org",
  "../org/checklist.org",
];

export const FALLBACK_DATA = [
  {
    file: "work.org",
    items: [
      {
        title: "Review Q3 roadmap",
        state: "TODO",
        scheduled: "2025-03-08",
        timestamps: ["2025-03-08"],
        tags: ["work"],
        path: ["Work", "Strategy"],
      },
    ],
  },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

const parseTags = (text) => {
  const tagMatch = text.match(/(?:\s|^)(:([A-Za-z0-9_@#%]+:)+)\s*$/);
  if (!tagMatch) {
    return { text, tags: [] };
  }
  const tags = tagMatch[1].split(":").filter(Boolean);
  const cleaned = text.replace(tagMatch[1], "").trim();
  return { text: cleaned, tags };
};

const parseOrgFile = (fileName, content) => {
  const lines = content.split(/\r?\n/);
  const items = [];
  const stack = [];
  let currentItem = null;

  lines.forEach((line) => {
    const headingMatch = line.match(/^(\*+)\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();
      const parsed = parseTags(headingText);
      let title = parsed.text;
      const headingTags = parsed.tags;
      let stateValue = null;
      const stateMatch = title.match(/^([A-Z]{2,})\s+(.*)$/);
      if (stateMatch) {
        stateValue = stateMatch[1];
        title = stateMatch[2].trim();
      }

      stack.length = Math.max(0, level - 1);
      const parentTags = stack.flatMap((entry) => entry.tags);
      const path = stack.map((entry) => entry.title);
      stack[level - 1] = { title, tags: headingTags };

      const topHeadline = stack[0]?.title;
      const derivedTags = topHeadline ? [topHeadline] : [];
      const tags = Array.from(
        new Set([...parentTags, ...headingTags, ...derivedTags])
      );
      const item = {
        title,
        state: stateValue,
        scheduled: null,
        timestamps: [],
        tags,
        path: path.length ? path : ["Inbox"],
        level,
        isTask: Boolean(stateValue),
      };
      items.push(item);
      currentItem = item;
      return;
    }

    const scheduledMatch = line.match(/SCHEDULED:\s*<(\d{4}-\d{2}-\d{2})/);
    if (scheduledMatch && currentItem) {
      currentItem.scheduled = scheduledMatch[1];
      if (!currentItem.timestamps.includes(scheduledMatch[1])) {
        currentItem.timestamps.push(scheduledMatch[1]);
      }
    }
  });

  return {
    file: fileName,
    items,
  };
};

export const loadOrgData = async () => {
  const results = await Promise.all(
    ORG_FILE_PATHS.map(async (path) => {
      try {
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`Failed to load ${path}`);
        }
        const text = await response.text();
        const fileName = path.split("/").pop();
        return parseOrgFile(fileName, text);
      } catch (error) {
        console.warn(error);
        return null;
      }
    })
  );

  return results.filter(Boolean).filter((entry) => entry.items.length > 0);
};

const normalizeQuery = (query) => query.trim().replace(/\s+/g, " ");

const parseQuery = (query) => {
  if (!query) {
    return () => true;
  }
  const text = normalizeQuery(query);
  const filters = [];
  const parts = text.split(/\s+AND\s+/i);
  for (const part of parts) {
    const cleaned = part.trim();
    if (/^SCHEDULED\s*<=\s*today$/i.test(cleaned)) {
      filters.push((item) => item.scheduled && item.scheduled <= todayISO());
    } else if (/^TIMESTAMP\s*=\s*today$/i.test(cleaned)) {
      filters.push((item) => item.timestamps?.includes(todayISO()));
    } else if (/^TODO\s*!=\s*DONE$/i.test(cleaned)) {
      filters.push((item) => item.state !== "DONE");
    } else if (/^TAG\s*~\s*"(.+)"$/i.test(cleaned)) {
      const [, tag] = cleaned.match(/^TAG\s*~\s*"(.+)"$/i);
      filters.push((item) => item.tags?.some((t) => t.includes(tag)));
    }
  }
  return (item) => filters.every((fn) => fn(item));
};

export const flattenItems = () =>
  state.data.flatMap((file) =>
    file.items.map((item, index) => ({
      ...item,
      file: file.file,
      index,
    }))
  );

export const getAgendaItems = () => {
  const view = viewConfig[state.view] || viewConfig.today;
  const match = parseQuery(view.query || "");
  const query = state.query.trim().toLowerCase();
  const filtered = flattenItems().filter((item) => {
    if (!match(item) || !view.predicate(item)) {
      return false;
    }
    if (!query) {
      return true;
    }
    const pathText = item.path?.join(" / ").toLowerCase() || "";
    const tagText = item.tags?.join(" ").toLowerCase() || "";
    const titleText = item.title?.toLowerCase() || "";
    return (
      titleText.includes(query) ||
      pathText.includes(query) ||
      tagText.includes(query)
    );
  });
  if (state.view === "all") {
    return filtered;
  }
  return filtered.filter((item) => item.isTask);
};

export const getNextItems = () => {
  const match = parseQuery("SCHEDULED > today AND TODO != DONE");
  return flattenItems().filter(match);
};

export const setTaskState = (fileName, index, isDone) => {
  const targetFile = state.data.find((entry) => entry.file === fileName);
  if (!targetFile) return;
  const targetItem = targetFile.items[index];
  if (!targetItem) return;
  if (isDone) {
    if (targetItem.state !== "DONE") {
      targetItem.prevState = targetItem.state;
      targetItem.state = "DONE";
    }
    return;
  }
  targetItem.state = targetItem.prevState || "TODO";
  delete targetItem.prevState;
};

export const cycleTaskState = (fileName, index) => {
  const targetFile = state.data.find((entry) => entry.file === fileName);
  if (!targetFile) return;
  const targetItem = targetFile.items[index];
  if (!targetItem) return;
  const current = targetItem.state || "TODO";
  const currentIndex = STATUS_ORDER.indexOf(current);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % STATUS_ORDER.length;
  targetItem.state = STATUS_ORDER[nextIndex];
};

export const setTaskStateValue = (fileName, index, stateValue) => {
  const targetFile = state.data.find((entry) => entry.file === fileName);
  if (!targetFile) return;
  const targetItem = targetFile.items[index];
  if (!targetItem) return;
  targetItem.state = stateValue;
};

export const buildSaveTargets = () => {
  const targets = new Map();
  state.data.forEach((fileEntry) => {
    const fileName = fileEntry.file;
    fileEntry.items.forEach((item) => {
      const pathParts = item.path?.length ? item.path : ["Inbox"];
      const prefixes = [];
      pathParts.forEach((part) => {
        if (!prefixes.length) {
          prefixes.push(part);
        } else {
          prefixes.push(`${prefixes[prefixes.length - 1]} / ${part}`);
        }
      });
      prefixes.forEach((prefix) => {
        const value = `${fileName}|${prefix}`;
        const label = `${fileName} · ${prefix}`;
        targets.set(value, label);
      });
    });
  });
  return [...targets.entries()].sort((a, b) => a[1].localeCompare(b[1]));
};

export const addTaskItem = ({ title, status, date, target }) => {
  const trimmed = title.trim();
  if (!trimmed) return;
  const [fileName, pathLabel] = (target || "inbox.org|Inbox").split("|");
  let targetFile = state.data.find((entry) => entry.file === fileName);
  if (!targetFile) {
    targetFile = { file: fileName, items: [] };
    state.data.unshift(targetFile);
  }
  const path = pathLabel ? pathLabel.split(" / ") : ["Inbox"];
  const item = {
    title: trimmed,
    state: status || "TODO",
    scheduled: date || null,
    timestamps: date ? [date] : [],
    tags: [],
    path,
    level: 1,
    isTask: true,
  };
  targetFile.items.unshift(item);
};
