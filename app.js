const ORG_FILE_PATHS = [
  "org/todo.org",
  "org/inbox.org",
  "org/routines.org",
  "org/checklist.org",
];

const FALLBACK_DATA = [
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

const state = {
  data: [],
  groupByPath: true,
  view: "today",
  query: "",
};

const STATUS_ORDER = ["TODO", "WIP", "DONE"];

const agendaList = document.getElementById("agendaList");
const appTitle = document.querySelector(".top-nav__title");
const appHeader = document.querySelector(".app-header");
const searchInput = document.getElementById("searchInput");
const viewButtons = document.querySelectorAll("[data-view]");
const fabButton = document.querySelector(".fab");
const taskModal = document.getElementById("taskModal");
const taskForm = document.getElementById("taskForm");
const taskTitleInput = document.getElementById("taskTitle");
const taskStatusInput = document.getElementById("taskStatus");
const taskDateInput = document.getElementById("taskDate");
const taskDateValue = document.getElementById("taskDateValue");
const taskTargetInput = document.getElementById("taskTarget");
const statusPicker = document.getElementById("statusPicker");
const statusPickerButton = statusPicker?.querySelector(".status-picker__button");
const statusPickerValue = statusPicker?.querySelector(".status-picker__value");
const statusPickerChip = statusPicker?.querySelector(".status-chip");
const savePicker = document.getElementById("savePicker");
const savePickerButton = savePicker?.querySelector(".save-picker__button");
const savePickerValue = savePicker?.querySelector(".save-picker__value");
const pickerSheet = document.getElementById("pickerSheet");
const pickerTitle = document.getElementById("pickerTitle");
const pickerSearch = document.getElementById("pickerSearch");
const pickerList = document.getElementById("pickerList");

const todayISO = () => new Date().toISOString().slice(0, 10);

const openTaskModal = () => {
  if (!taskModal) return;
  taskModal.classList.remove("hidden");
  taskTitleInput?.focus();
};

const closeTaskModal = () => {
  if (!taskModal) return;
  taskModal.classList.add("hidden");
  if (taskForm) {
    taskForm.reset();
  }
  closePickerSheet();
  if (taskDateInput) {
    taskDateInput.value = "";
  }
  if (taskDateValue) {
    taskDateValue.textContent = "Date";
  }
};

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
      let state = null;
      const stateMatch = title.match(/^([A-Z]{2,})\s+(.*)$/);
      if (stateMatch) {
        state = stateMatch[1];
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
        state,
        scheduled: null,
        timestamps: [],
        tags,
        path: path.length ? path : ["Inbox"],
        level,
        isTask: Boolean(state),
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

const loadOrgData = async () => {
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

const flattenItems = () =>
  state.data.flatMap((file) =>
    file.items.map((item, index) => ({
      ...item,
      file: file.file,
      index,
    }))
  );

const viewConfig = {
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

const getAgendaItems = () => {
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

const getNextItems = () => {
  const match = parseQuery("SCHEDULED > today AND TODO != DONE");
  return flattenItems().filter(match);
};

const setTaskState = (fileName, index, isDone) => {
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

const cycleTaskState = (fileName, index) => {
  const targetFile = state.data.find((entry) => entry.file === fileName);
  if (!targetFile) return;
  const targetItem = targetFile.items[index];
  if (!targetItem) return;
  const current = targetItem.state || "TODO";
  const currentIndex = STATUS_ORDER.indexOf(current);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % STATUS_ORDER.length;
  targetItem.state = STATUS_ORDER[nextIndex];
};

const setTaskStateValue = (fileName, index, stateValue) => {
  const targetFile = state.data.find((entry) => entry.file === fileName);
  if (!targetFile) return;
  const targetItem = targetFile.items[index];
  if (!targetItem) return;
  targetItem.state = stateValue;
};

const buildSaveTargets = () => {
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

const populateTargetOptions = () => {
  if (!taskTargetInput || !savePickerValue) return;
  const targets = buildSaveTargets();
  const nextValue = targets.length ? targets[0][0] : "inbox.org|Inbox";
  taskTargetInput.value = nextValue;
  savePickerValue.textContent = nextValue.split("|")[1]?.split(" / ").slice(-1)[0] || "Inbox";
};

let activePicker = null;
let pickerOptions = [];

const renderPickerList = (query = "") => {
  if (!pickerList) return;
  const normalized = query.trim().toLowerCase();
  pickerList.innerHTML = "";
  const filtered = pickerOptions.filter((option) => {
    if (!normalized) return true;
    return option.label.toLowerCase().includes(normalized);
  });
  filtered.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "picker-sheet__option";
    button.dataset.value = option.value;
    if (option.state) {
      const chip = document.createElement("span");
      chip.className = "status-chip";
      chip.dataset.state = option.state;
      chip.setAttribute("aria-hidden", "true");
      button.appendChild(chip);
    }
    const text = document.createElement("span");
    text.textContent = option.label;
    button.appendChild(text);
    pickerList.appendChild(button);
  });
};

const openPickerSheet = (type) => {
  if (!pickerSheet || !pickerSearch) return;
  activePicker = type;
  if (type === "status") {
    pickerOptions = [
      { value: "TODO", label: "TODO", state: "TODO" },
      { value: "WIP", label: "WIP", state: "WIP" },
      { value: "PROJ", label: "PROJ", state: "PROJ" },
      { value: "DONE", label: "DONE", state: "DONE" },
      { value: "KILL", label: "KILL", state: "KILL" },
    ];
  } else {
    const targets = buildSaveTargets();
    pickerOptions = targets.length
      ? targets.map(([value, label]) => ({ value, label }))
      : [{ value: "inbox.org|Inbox", label: "inbox.org · Inbox" }];
  }
  pickerSearch.value = "";
  renderPickerList();
  pickerSheet.classList.remove("hidden");
  pickerSearch.focus();
};

const closePickerSheet = () => {
  if (!pickerSheet) return;
  pickerSheet.classList.add("hidden");
  activePicker = null;
};

const addTaskItem = ({ title, status, date, target }) => {
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

const renderAgenda = () => {
  const items = getAgendaItems();
  agendaList.innerHTML = "";
  const headlineChildren =
    state.view === "all"
      ? items.reduce((map, item, index) => {
          if (item.isTask) return map;
          let hasChild = false;
          for (let i = index + 1; i < items.length; i += 1) {
            if (items[i].level <= item.level) break;
            if (items[i].level > item.level) {
              hasChild = true;
              break;
            }
          }
          map.set(`${item.file}|${item.index}`, hasChild);
          return map;
        }, new Map())
      : null;

  if (!items.length) {
    const empty = document.createElement("li");
    empty.className = "agenda__item";
    empty.innerHTML = "<strong>No items match this query.</strong>";
    agendaList.appendChild(empty);
    return;
  }

  const renderItem = (item) => {
    const li = document.createElement("li");
    const outlineClass = state.view === "all" ? "agenda__item--outline" : "";
    const levelClass =
      state.view === "all" ? `agenda__item--level-${item.level}` : "";
    const metaHtml =
      item.scheduled && !item.isTask
        ? `<div class="agenda__meta"><span>${item.scheduled}</span></div>`
        : "";

    if (!item.isTask) {
      const headlineTitle =
        state.view === "all"
          ? [...(item.path || []), item.title].filter(Boolean).join(" / ")
          : item.title;
      const hasChildren =
        headlineChildren?.get(`${item.file}|${item.index}`) ?? false;
      if (state.view === "all" && !hasChildren) {
        const scheduledHtml = item.scheduled
          ? `<span class="agenda__date">${item.scheduled}</span>`
          : "";
        li.className = `agenda__item ${outlineClass} ${levelClass}`.trim();
        li.innerHTML = `
          <div class="agenda__check">
            <span class="agenda__status agenda__status--none" aria-hidden="true"></span>
            <span class="agenda__text">
              <span class="agenda__title-row">
                <span class="agenda__title">${headlineTitle}</span>
                ${scheduledHtml}
              </span>
            </span>
          </div>
          ${metaHtml}
        `;
      } else {
        li.className = `agenda__item agenda__item--headline ${outlineClass} ${levelClass}`.trim();
        li.innerHTML = `
          <div class="agenda__text">
            <span class="agenda__title">${headlineTitle}</span>
          </div>
          ${metaHtml}
        `;
      }
      return li;
    }

    li.className = `agenda__item ${outlineClass} ${levelClass}${
      item.state === "DONE" ? " is-done" : ""
    }`.trim();
    const scheduledHtml = item.scheduled
      ? `<span class="agenda__date">${item.scheduled}</span>`
      : "";
    const statusLabel = item.state || "TODO";

    li.innerHTML = `
      <label class="agenda__check" data-file="${item.file}" data-index="${item.index}">
        <span class="agenda__status" data-state="${statusLabel}" aria-label="${statusLabel}" title="${statusLabel}"></span>
        <span class="agenda__text">
          <span class="agenda__title-row">
            <span class="agenda__title">${item.title}</span>
            ${scheduledHtml}
          </span>
        </span>
      </label>
      <button class="agenda__action" type="button" data-file="${item.file}" data-index="${item.index}">
        KILL
      </button>
      ${metaHtml}
    `;
    return li;
  };

  if (!state.groupByPath || state.view === "all") {
    items.forEach((item) => agendaList.appendChild(renderItem(item)));
    return;
  }

  const grouped = new Map();
  items.forEach((item) => {
    const label = item.path.length
      ? `${item.file} · ${item.path.join(" / ")}`
      : item.file;
    const key = `${item.file}|${item.path.join("/")}`;
    if (!grouped.has(key)) {
      grouped.set(key, { label, items: [], path: item.path, file: item.file });
    }
    grouped.get(key).items.push(item);
  });

  const orderedGroups = [...grouped.values()].sort((a, b) => {
    if (a.path.length !== b.path.length) {
      return a.path.length - b.path.length;
    }
    return a.label.localeCompare(b.label);
  });

  orderedGroups.forEach((group) => {
    const wrapper = document.createElement("li");
    wrapper.className = "agenda__group";
    wrapper.innerHTML = `
      <div class="agenda__group-header">
        <span class="agenda__group-title">${group.label}</span>
      </div>
      <ul class="agenda__group-list"></ul>
    `;
    const list = wrapper.querySelector(".agenda__group-list");
    group.items.forEach((item) => list.appendChild(renderItem(item)));
    agendaList.appendChild(wrapper);
  });
};

const renderHeader = () => {
  if (!appHeader) return;
  const view = viewConfig[state.view] || viewConfig.today;
  const totalCount = getAgendaItems().length;
  const nextCount = getNextItems().length;

  appHeader.querySelector(".summary")?.remove();
  appHeader.insertAdjacentHTML(
    "beforeend",
    `
    <div class="summary">
      <div class="summary__titleblock">
        <p class="summary__eyebrow">Filter</p>
        <p class="summary__title">${view.summary}</p>
      </div>
      <div class="summary__stats">
        <div class="summary__stat">
          <span class="summary__stat-label">Showing</span>
          <span class="summary__stat-value">${totalCount}</span>
        </div>
        <div class="summary__stat">
          <span class="summary__stat-label">Next up</span>
          <span class="summary__stat-value">${nextCount}</span>
        </div>
      </div>
    </div>
    `
  );
};

const refresh = () => {
  const view = viewConfig[state.view] || viewConfig.today;
  if (appTitle) {
    appTitle.textContent = view.title;
  }
  agendaList.classList.toggle("agenda--outline", false);
  renderHeader();
  renderAgenda();
  viewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.view);
  });
};

const initializeData = async () => {
  const data = await loadOrgData();
  state.data = data.length ? data : JSON.parse(JSON.stringify(FALLBACK_DATA));
  populateTargetOptions();
  refresh();
};

agendaList.addEventListener("click", (event) => {
  const action = event.target.closest(".agenda__action");
  if (action) {
    suppressClick = false;
    const fileName = action.dataset.file;
    if (!fileName) return;
    const index = Number.parseInt(action.dataset.index, 10);
    if (Number.isNaN(index)) return;
    setTaskStateValue(fileName, index, "KILL");
    refresh();
    return;
  }
  const target = event.target.closest(".agenda__check");
  if (!target) return;
  if (suppressClick) {
    suppressClick = false;
    return;
  }
  const item = target.closest(".agenda__item");
  if (item?.classList.contains("is-revealed")) {
    item.classList.remove("is-revealed");
    target.style.transform = "translateX(0)";
    return;
  }
  const fileName = target.dataset.file;
  if (!fileName) return;
  const index = Number.parseInt(target.dataset.index, 10);
  if (Number.isNaN(index)) return;
  const targetFile = state.data.find((entry) => entry.file === fileName);
  const targetItem = targetFile?.items[index];
  if (targetItem?.state === "PROJ") return;
  cycleTaskState(fileName, index);
  refresh();
});

let swipeState = null;
let suppressClick = false;

agendaList.addEventListener("touchstart", (event) => {
  const target = event.target.closest(".agenda__check");
  if (!target?.dataset.file) return;
  const item = target.closest(".agenda__item");
  if (!item) return;
  const touch = event.touches[0];
  swipeState = {
    target,
    item,
    startX: touch.clientX,
    startY: touch.clientY,
  };
});

agendaList.addEventListener("touchmove", (event) => {
  if (!swipeState) return;
  const touch = event.touches[0];
  const deltaX = touch.clientX - swipeState.startX;
  const deltaY = touch.clientY - swipeState.startY;
  if (Math.abs(deltaX) < 4) return;
  if (Math.abs(deltaX) > Math.abs(deltaY) + 6) {
    event.preventDefault();
    const clamped = Math.max(-96, Math.min(0, deltaX));
    swipeState.item.classList.add("is-swiping");
    swipeState.target.style.transform = `translateX(${clamped}px)`;
  }
}, { passive: false });

agendaList.addEventListener("touchend", (event) => {
  if (!swipeState) return;
  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - swipeState.startX;
  const deltaY = touch.clientY - swipeState.startY;
  const { target, item } = swipeState;
  swipeState = null;
  if (item) {
    item.classList.remove("is-swiping");
    target.style.transition = "transform 0.2s ease";
  }
  if (!target?.dataset.file) return;
  if (item) {
    if (deltaX < -60 && Math.abs(deltaY) < 30) {
      suppressClick = true;
      item.classList.add("is-revealed");
      target.style.transform = "translateX(-96px)";
    } else {
      item.classList.remove("is-revealed");
      target.style.transform = "translateX(0)";
    }
  }
});

agendaList.addEventListener("touchcancel", () => {
  if (swipeState?.item) {
    swipeState.item.classList.remove("is-swiping");
    swipeState.item.classList.remove("is-revealed");
    swipeState.target.style.transform = "translateX(0)";
  }
  swipeState = null;
});

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.view = button.dataset.view;
    refresh();
  });
});

if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    refresh();
  });
}

if (fabButton) {
  fabButton.addEventListener("click", () => {
    openTaskModal();
  });
}

if (taskModal) {
  taskModal.addEventListener("click", (event) => {
    if (event.target?.dataset?.closeModal) {
      closeTaskModal();
    }
  });
}

if (taskForm) {
  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addTaskItem({
      title: taskTitleInput?.value || "",
      status: taskStatusInput?.value || "TODO",
      date: taskDateInput?.value || "",
      target: taskTargetInput?.value || "inbox.org|Inbox",
    });
    closeTaskModal();
    populateTargetOptions();
    refresh();
  });
}

if (taskDateInput) {
  taskDateInput.addEventListener("change", () => {
    if (!taskDateValue) return;
    const value = taskDateInput.value;
    taskDateValue.textContent = value || "Date";
  });
}


if (statusPickerButton) {
  statusPickerButton.addEventListener("click", () => {
    openPickerSheet("status");
  });
}

if (savePickerButton) {
  savePickerButton.addEventListener("click", () => {
    openPickerSheet("save");
  });
}

if (pickerSearch) {
  pickerSearch.addEventListener("input", () => {
    renderPickerList(pickerSearch.value);
  });
}

if (pickerList) {
  pickerList.addEventListener("click", (event) => {
    const option = event.target.closest(".picker-sheet__option");
    if (!option) return;
    const value = option.dataset.value;
    if (!value) return;
    if (activePicker === "status") {
      if (taskStatusInput) {
        taskStatusInput.value = value;
      }
      if (statusPickerValue) {
        statusPickerValue.textContent = value;
      }
      if (statusPickerChip) {
        statusPickerChip.dataset.state = value;
      }
    } else if (activePicker === "save") {
      taskTargetInput.value = value;
      if (savePickerValue) {
        savePickerValue.textContent = value.split("|")[1]?.split(" / ").slice(-1)[0] || "Inbox";
      }
    }
    closePickerSheet();
  });
}

if (pickerSheet) {
  pickerSheet.addEventListener("click", (event) => {
    if (event.target?.dataset?.closePicker) {
      closePickerSheet();
    }
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePickerSheet();
    closeTaskModal();
  }
});

initializeData();
