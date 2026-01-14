import { state } from "./state.js";
import {
  FALLBACK_DATA,
  loadOrgData,
  buildSaveTargets,
  addTaskItem,
  cycleTaskState,
  setTaskStateValue,
} from "./data.js";
import { buildSettingsToastMessage, refresh } from "./ui.js";
import { initPicker } from "./picker.js";
import { bindEvents } from "./events.js";
import { initSettings, loadSettings, parsePathDepth, saveSettings } from "./settings.js";

// GraphQL endpoint resolves from window location; defaults to http://localhost:8080/.
// Expected responses: orgFiles { items }, orgFile(path) { headlines { id level title todo tags scheduled children { ... } } }.
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
const pickerSearch = document.getElementById("pickerSearch");
const pickerList = document.getElementById("pickerList");
const settingsButton = document.getElementById("settingsButton");
const settingsSheet = document.getElementById("settingsSheet");
const pathDepthSelect = document.getElementById("pathDepthSelect");
const saveToast = document.getElementById("saveToast");
const saveToastMessage = document.getElementById("saveToastMessage");
const settingsToast = document.getElementById("settingsToast");

const refreshUI = () =>
  refresh({
    agendaList,
    appHeader,
    viewButtons,
    appTitle,
  });

const settings = loadSettings();
state.pathDepth = parsePathDepth(settings.pathDepth);
if (pathDepthSelect) {
  pathDepthSelect.value = settings.pathDepth;
}

const setSavePickerDefault = () => {
  if (!taskTargetInput || !savePickerValue) return;
  const targets = buildSaveTargets();
  const nextValue = targets.length ? targets[0][0] : "inbox.org|Inbox";
  taskTargetInput.value = nextValue;
  savePickerValue.textContent = nextValue.split("|")[1]?.split(" / ").slice(-1)[0] || "Inbox";
};

let settingsToastTimer = null;
let settingsToastHideTimer = null;

const hideSettingsToast = () => {
  if (!settingsToast) return;
  settingsToast.classList.remove("is-visible");
  if (settingsToastTimer) {
    window.clearTimeout(settingsToastTimer);
    settingsToastTimer = null;
  }
  if (settingsToastHideTimer) {
    window.clearTimeout(settingsToastHideTimer);
  }
  settingsToastHideTimer = window.setTimeout(() => {
    settingsToast.classList.add("hidden");
  }, 200);
};

const showSettingsToast = (label) => {
  if (!settingsToast) return;
  settingsToast.textContent = buildSettingsToastMessage(label);
  settingsToast.classList.remove("hidden");
  if (settingsToastHideTimer) {
    window.clearTimeout(settingsToastHideTimer);
    settingsToastHideTimer = null;
  }
  requestAnimationFrame(() => {
    settingsToast.classList.add("is-visible");
  });
  if (settingsToastTimer) {
    window.clearTimeout(settingsToastTimer);
  }
  settingsToastTimer = window.setTimeout(() => {
    hideSettingsToast();
  }, 2200);
};

const { closePickerSheet } = initPicker({
  statusPickerButton,
  savePickerButton,
  pickerSheet,
  pickerSearch,
  pickerList,
  taskStatusInput,
  statusPickerValue,
  statusPickerChip,
  taskTargetInput,
  savePickerValue,
});

const { closeSettingsSheet } = initSettings({
  settingsButton,
  settingsSheet,
  pathDepthSelect,
  onChange: (nextDepth) => {
    state.pathDepth = parsePathDepth(nextDepth);
    saveSettings({ pathDepth: nextDepth });
    setSavePickerDefault();
    refreshUI();
    showSettingsToast();
  },
});

if (settingsButton) {
  settingsButton.addEventListener("click", () => {
    hideSettingsToast();
  });
}

bindEvents({
  agendaList,
  viewButtons,
  searchInput,
  fabButton,
  taskModal,
  taskForm,
  taskTitleInput,
  taskStatusInput,
  taskDateInput,
  taskDateValue,
  taskTargetInput,
  saveToast,
  saveToastMessage,
  refresh: refreshUI,
  cycleTaskState,
  setTaskStateValue,
  addTaskItem,
  closePickerSheet,
  closeSettingsSheet,
  afterAddTask: setSavePickerDefault,
});

const initializeData = async () => {
  const data = await loadOrgData();
  state.data = Array.isArray(data)
    ? data
    : JSON.parse(JSON.stringify(FALLBACK_DATA));
  setSavePickerDefault();
  refreshUI();
};

initializeData();
