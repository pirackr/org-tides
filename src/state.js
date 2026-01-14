export const STATUS_ORDER = ["TODO", "WIP", "DONE"];

export const state = {
  data: [],
  groupByPath: true,
  pathDepth: null,
  view: "today",
  query: "",
};

export const viewConfig = {
  inbox: {
    title: "Inbox",
    query: "TODO != DONE",
    predicate: (item) => item.file === "inbox.org",
    summary: "Inbox",
  },
  today: {
    title: "Today",
    query: "SCHEDULED <= today AND TODO != DONE",
    predicate: () => true,
    summary: "SCHEDULED <= today",
  },
  browse: {
    title: "Browse",
    query: "",
    predicate: () => true,
    summary: "All tasks",
  },
};
