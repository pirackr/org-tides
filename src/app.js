import { state } from "./state.js";
import {
  FALLBACK_DATA,
  loadOrgData,
  buildSaveTargets,
  addTaskItem,
  cycleTaskState,
  setTaskStateValue,
} from "./data.js";
import { refresh } from "./ui.js";
import { initPicker } from "./picker.js";
import { bindEvents } from "./events.js";

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

const setSavePickerDefault = () => {
  if (!taskTargetInput || !savePickerValue) return;
  const targets = buildSaveTargets();
  const nextValue = targets.length ? targets[0][0] : "inbox.org|Inbox";
  taskTargetInput.value = nextValue;
  savePickerValue.textContent = nextValue.split("|")[1]?.split(" / ").slice(-1)[0] || "Inbox";
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
  refresh: () =>
    refresh({
      agendaList,
      appHeader,
      viewButtons,
      appTitle,
    }),
  cycleTaskState,
  setTaskStateValue,
  addTaskItem,
  closePickerSheet,
  afterAddTask: setSavePickerDefault,
});

const initializeData = async () => {
  const data = await loadOrgData();
  state.data = data.length ? data : JSON.parse(JSON.stringify(FALLBACK_DATA));
  setSavePickerDefault();
  refresh({
    agendaList,
    appHeader,
    viewButtons,
    appTitle,
  });
};

initializeData();
