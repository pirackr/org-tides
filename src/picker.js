import { buildSaveTargets } from "./data.js";

export const initPicker = ({
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
}) => {
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
        if (taskTargetInput) {
          taskTargetInput.value = value;
        }
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

  return { openPickerSheet, closePickerSheet };
};
