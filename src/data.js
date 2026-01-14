import { STATUS_ORDER, state, viewConfig } from "./state.js";

const DEFAULT_GRAPHQL_ENDPOINT = "http://localhost:8080/";

const ensureTrailingSlash = (value) =>
  value.endsWith("/") ? value : `${value}/`;

export const resolveGraphQLEndpoint = () => {
  if (typeof window === "undefined") {
    return DEFAULT_GRAPHQL_ENDPOINT;
  }
  const override = window.ORG_BACKEND_URL?.trim();
  if (override) {
    return ensureTrailingSlash(override);
  }
  const hostname = window.location?.hostname;
  const origin = window.location?.origin;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return DEFAULT_GRAPHQL_ENDPOINT;
  }
  if (origin) {
    return ensureTrailingSlash(origin);
  }
  return DEFAULT_GRAPHQL_ENDPOINT;
};

const GRAPHQL_ENDPOINT = resolveGraphQLEndpoint();
const HEADLINE_FIELDS = "id level title todo tags scheduled";
const MAX_HEADLINE_DEPTH = 6;

export const buildHeadlineSelection = (depth = MAX_HEADLINE_DEPTH) => {
  let selection = HEADLINE_FIELDS;
  for (let i = 0; i < depth; i += 1) {
    selection = `${HEADLINE_FIELDS} children { ${selection} }`;
  }
  return selection;
};

const HEADLINE_SELECTION = buildHeadlineSelection(MAX_HEADLINE_DEPTH);

const ORG_FILES_QUERY = "query { orgFiles { items } }";
const ORG_FILE_QUERY = `
  query OrgFile($path: String!) {
    orgFile(path: $path) {
      headlines { ${HEADLINE_SELECTION} }
    }
  }
`;
const INSERT_HEADLINE_AFTER_MUTATION = `
  mutation InsertHeadlineAfter($path: String!, $afterId: String!, $title: String!) {
    insertHeadlineAfter(path: $path, afterId: $afterId, title: $title)
  }
`;
const UPDATE_HEADLINE_TODO_MUTATION = `
  mutation UpdateHeadlineTodo($path: String!, $id: String!, $todo: String!) {
    updateHeadlineTodo(path: $path, id: $id, todo: $todo)
  }
`;
const UPDATE_HEADLINE_SCHEDULED_MUTATION = `
  mutation UpdateHeadlineScheduled($path: String!, $id: String!, $scheduled: String!) {
    updateHeadlineScheduled(path: $path, id: $id, scheduled: $scheduled)
  }
`;
const WRITE_ORG_FILE_MUTATION = `
  mutation WriteOrgFile($path: String!, $content: String!) {
    writeOrgFile(path: $path, content: $content)
  }
`;

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

const getAuthEnvelope = () => {
  if (typeof window === "undefined") return {};
  const token = window.ORG_BACKEND_TOKEN;
  if (!token) return {};
  const trimmed = token.trim();
  if (!trimmed) return {};
  const value = trimmed.startsWith("Bearer ") ? trimmed : `Bearer ${trimmed}`;
  return { authorization: value };
};

const requestGraphQL = async (query, variables = {}) => {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables, ...getAuthEnvelope() }),
  });
  const payload = await response.json();
  if (!response.ok) {
    const message =
      payload?.errors?.[0]?.message ||
      `GraphQL request failed (${response.status})`;
    throw new Error(message);
  }
  if (payload?.errors?.length) {
    throw new Error(payload.errors[0].message || "GraphQL error");
  }
  return payload.data;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export const normalizeScheduled = (value) => {
  if (!value) return null;
  const match = String(value).match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : String(value).trim();
};

export const slugify = (value) => {
  if (!value) return "";
  const text = String(value).toLowerCase();
  let slug = "";
  for (const char of text) {
    if (/[a-z0-9]/.test(char)) {
      slug += char;
    } else if (char === " ") {
      slug += "-";
    }
  }
  return slug.replace(/^-+/, "").replace(/-+$/, "");
};

const uniqueTags = (tags) => [...new Set(tags.filter(Boolean))];

export const mapHeadlinesToItems = (headlines = []) => {
  const items = [];
  const walk = (nodes, ancestors, topTitle) => {
    nodes.forEach((headline) => {
      const nextTopTitle = topTitle ?? headline.title;
      const ancestorTags = ancestors.flatMap((entry) => entry.tags || []);
      const path = ancestors.map((entry) => entry.title).filter(Boolean);
      const tags = uniqueTags([
        ...ancestorTags,
        ...(headline.tags || []),
        ...(nextTopTitle ? [nextTopTitle] : []),
      ]);
      const scheduled = normalizeScheduled(headline.scheduled);
      items.push({
        id: headline.id,
        title: headline.title,
        state: headline.todo ?? null,
        scheduled,
        timestamps: scheduled ? [scheduled] : [],
        tags,
        path: path.length ? path : ["Inbox"],
        level: headline.level ?? 1,
        isTask: Boolean(headline.todo),
      });
      if (headline.children?.length) {
        walk(
          headline.children,
          [...ancestors, { title: headline.title, tags: headline.tags || [] }],
          nextTopTitle
        );
      }
    });
  };
  walk(headlines, [], null);
  return items;
};

export const buildTaskContent = ({ title, status, date }) => {
  const todo = status ? `${status.trim()} ` : "";
  const lines = [`* ${todo}${title}`];
  if (date) {
    lines.push(`SCHEDULED: <${date}>`);
  }
  return `${lines.join("\n")}\n`;
};

export const pickInsertAfterId = (items = []) => {
  if (!items.length) return null;
  const topLevel = items.filter((item) => item.level === 1 && item.id);
  if (topLevel.length) {
    return topLevel[topLevel.length - 1].id;
  }
  const lastWithId = [...items].reverse().find((item) => item.id);
  return lastWithId?.id || null;
};

export const loadOrgData = async () => {
  try {
    const data = await requestGraphQL(ORG_FILES_QUERY);
    const files = data?.orgFiles?.items ?? [];
    const results = await Promise.all(
      files.map(async (path) => {
        try {
          const fileData = await requestGraphQL(ORG_FILE_QUERY, { path });
          const headlines = fileData?.orgFile?.headlines ?? [];
          return { file: path, items: mapHeadlinesToItems(headlines) };
        } catch (error) {
          console.warn(`Failed to load ${path}`, error);
          return null;
        }
      })
    );
    return results.filter(Boolean);
  } catch (error) {
    console.warn("Failed to load org data", error);
    return null;
  }
};

const updateHeadlineTodo = async ({ path, id, todo }) =>
  requestGraphQL(UPDATE_HEADLINE_TODO_MUTATION, { path, id, todo });

const updateHeadlineScheduled = async ({ path, id, scheduled }) =>
  requestGraphQL(UPDATE_HEADLINE_SCHEDULED_MUTATION, { path, id, scheduled });

const insertHeadlineAfter = async ({ path, afterId, title }) =>
  requestGraphQL(INSERT_HEADLINE_AFTER_MUTATION, { path, afterId, title });

const writeOrgFile = async ({ path, content }) =>
  requestGraphQL(WRITE_ORG_FILE_MUTATION, { path, content });

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

export const setTaskState = async (fileName, index, isDone) => {
  const targetFile = state.data.find((entry) => entry.file === fileName);
  if (!targetFile) return;
  const targetItem = targetFile.items[index];
  if (!targetItem) return;
  const previousState = targetItem.state;
  const previousPrev = targetItem.prevState;
  if (isDone) {
    if (targetItem.state !== "DONE") {
      targetItem.prevState = targetItem.state;
      targetItem.state = "DONE";
    }
  } else {
    targetItem.state = targetItem.prevState || "TODO";
    delete targetItem.prevState;
  }
  if (!targetItem.id) return;
  try {
    await updateHeadlineTodo({
      path: fileName,
      id: targetItem.id,
      todo: targetItem.state || "",
    });
  } catch (error) {
    console.warn("Failed to update task state", error);
    targetItem.state = previousState;
    if (previousPrev) {
      targetItem.prevState = previousPrev;
    } else {
      delete targetItem.prevState;
    }
  }
};

const applyTodoUpdate = async (fileName, index, nextState) => {
  const targetFile = state.data.find((entry) => entry.file === fileName);
  if (!targetFile) return;
  const targetItem = targetFile.items[index];
  if (!targetItem) return;
  const previousState = targetItem.state;
  targetItem.state = nextState;
  if (!targetItem.id) return;
  try {
    await updateHeadlineTodo({
      path: fileName,
      id: targetItem.id,
      todo: nextState || "",
    });
  } catch (error) {
    console.warn("Failed to update task state", error);
    targetItem.state = previousState;
  }
};

export const cycleTaskState = async (fileName, index) => {
  const targetFile = state.data.find((entry) => entry.file === fileName);
  if (!targetFile) return;
  const targetItem = targetFile.items[index];
  if (!targetItem) return;
  const current = targetItem.state || "TODO";
  const currentIndex = STATUS_ORDER.indexOf(current);
  const nextIndex =
    currentIndex === -1 ? 0 : (currentIndex + 1) % STATUS_ORDER.length;
  const nextState = STATUS_ORDER[nextIndex];
  await applyTodoUpdate(fileName, index, nextState);
};

export const setTaskStateValue = async (fileName, index, stateValue) => {
  await applyTodoUpdate(fileName, index, stateValue);
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

export const addTaskItem = async ({ title, status, date, target }) => {
  const trimmed = title.trim();
  if (!trimmed) return;
  const [fileName] = (target || "inbox.org|Inbox").split("|");
  const targetFile = state.data.find((entry) => entry.file === fileName);
  const insertionId = pickInsertAfterId(targetFile?.items || []);

  try {
    if (insertionId) {
      await insertHeadlineAfter({
        path: fileName,
        afterId: insertionId,
        title: trimmed,
      });
      const newId = slugify(trimmed);
      if (status) {
        await updateHeadlineTodo({ path: fileName, id: newId, todo: status });
      }
      if (date) {
        await updateHeadlineScheduled({
          path: fileName,
          id: newId,
          scheduled: date,
        });
      }
    } else {
      const content = buildTaskContent({ title: trimmed, status, date });
      await writeOrgFile({ path: fileName, content });
    }
  } catch (error) {
    console.warn("Failed to add task", error);
    return;
  }

  const data = await loadOrgData();
  if (Array.isArray(data)) {
    state.data = data;
  }
};
