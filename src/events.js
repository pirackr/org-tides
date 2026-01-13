import { state } from "./state.js";

export const bindEvents = ({
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
  refresh,
  cycleTaskState,
  setTaskStateValue,
  addTaskItem,
  closePickerSheet,
  afterAddTask,
}) => {
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
    closePickerSheet?.();
    if (taskDateInput) {
      taskDateInput.value = "";
    }
    if (taskDateValue) {
      taskDateValue.textContent = "Date";
    }
  };

  let swipeState = null;
  let suppressClick = false;

  if (agendaList) {
    agendaList.addEventListener("click", async (event) => {
      const action = event.target.closest(".agenda__action");
      if (action) {
        suppressClick = false;
        const fileName = action.dataset.file;
        if (!fileName) return;
        const index = Number.parseInt(action.dataset.index, 10);
        if (Number.isNaN(index)) return;
        await setTaskStateValue(fileName, index, "KILL");
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
      await cycleTaskState(fileName, index);
      refresh();
    });

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

    agendaList.addEventListener(
      "touchmove",
      (event) => {
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
      },
      { passive: false }
    );

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
  }

  viewButtons?.forEach((button) => {
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
    taskForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await addTaskItem({
        title: taskTitleInput?.value || "",
        status: taskStatusInput?.value || "TODO",
        date: taskDateInput?.value || "",
        target: taskTargetInput?.value || "inbox.org|Inbox",
      });
      closeTaskModal();
      if (afterAddTask) {
        afterAddTask();
      }
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

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePickerSheet?.();
      closeTaskModal();
    }
  });

  return { openTaskModal, closeTaskModal };
};
