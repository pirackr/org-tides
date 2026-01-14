import { state, viewConfig } from "./state.js";
import { getAgendaItems, getNextItems, limitPathDepth } from "./data.js";

export const renderAgenda = (agendaList) => {
  if (!agendaList) return;
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
    const path = limitPathDepth(item.path, state.pathDepth);
    const label = path.length ? `${item.file} · ${path.join(" / ")}` : item.file;
    const key = `${item.file}|${path.join("/")}`;
    if (!grouped.has(key)) {
      grouped.set(key, { label, items: [], path, file: item.file });
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

export const renderHeader = (appHeader) => {
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

export const refresh = ({ agendaList, appHeader, viewButtons, appTitle }) => {
  const view = viewConfig[state.view] || viewConfig.today;
  if (appTitle) {
    appTitle.textContent = view.title;
  }
  if (agendaList) {
    agendaList.classList.toggle("agenda--outline", false);
  }
  renderHeader(appHeader);
  renderAgenda(agendaList);
  viewButtons?.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.view);
  });
};
