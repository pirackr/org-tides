import { state } from "./state.js";
import { buildSaveToastMessage } from "./ui.js";

const PULL_REFRESH_THRESHOLD = 56;
const PULL_REFRESH_MAX = 72;
const PULL_REFRESH_SLOP = 14;
const PULL_INDICATOR_HIDDEN_OFFSET = 0;
const PULL_INDICATOR_VISIBLE_OFFSET = 16;
const PULL_LABEL = "Pull to refresh";
const PULL_READY_LABEL = "Release to refresh";
const PULL_LOADING_LABEL = "Refreshing...";

export const shouldTriggerPullRefresh = ({
  deltaX = 0,
  deltaY = 0,
  scrollTop = 0,
  threshold = PULL_REFRESH_THRESHOLD,
} = {}) => {
  if (scrollTop > 0) return false;
  if (deltaY < threshold) return false;
  if (Math.abs(deltaY) <= Math.abs(deltaX) + PULL_REFRESH_SLOP) return false;
  return deltaY > 0;
};

export const getPullIndicatorState = ({
  deltaX = 0,
  deltaY = 0,
  scrollTop = 0,
  threshold = PULL_REFRESH_THRESHOLD,
  max = PULL_REFRESH_MAX,
} = {}) => {
  if (scrollTop > 0) {
    return {
      isActive: false,
      isReady: false,
      label: PULL_LABEL,
      offset: 0,
    };
  }
  if (deltaY <= 0) {
    return {
      isActive: false,
      isReady: false,
      label: PULL_LABEL,
      offset: 0,
    };
  }
  if (Math.abs(deltaY) <= Math.abs(deltaX) + PULL_REFRESH_SLOP) {
    return {
      isActive: false,
      isReady: false,
      label: PULL_LABEL,
      offset: 0,
    };
  }
  const clamped = Math.min(max, deltaY);
  const isReady = clamped >= threshold;
  return {
    isActive: true,
    isReady,
    label: isReady ? PULL_READY_LABEL : PULL_LABEL,
    offset: Math.min(8, Math.max(0, clamped - threshold)),
  };
};

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
  saveToast,
  saveToastMessage,
  refresh,
  cycleTaskState,
  setTaskStateValue,
  addTaskItem,
  closePickerSheet,
  closeSettingsSheet,
  afterAddTask,
  onPullRefresh,
  pullIndicator,
  pullIndicatorLabel,
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
  let pullState = null;
  let pullRefreshInFlight = false;
  let suppressClick = false;
  let saveToastTimer = null;
  let saveToastHideTimer = null;

  const setPullIndicatorState = (state, deltaY = 0) => {
    if (!pullIndicator) return;
    const isLoading = pullRefreshInFlight;
    const isVisible = isLoading || state?.isActive;
    const label = isLoading ? PULL_LOADING_LABEL : state?.label || PULL_LABEL;
    const paddedDelta = deltaY + (state?.offset || 0);
    const clampedOffset = Math.min(
      PULL_INDICATOR_VISIBLE_OFFSET,
      PULL_INDICATOR_HIDDEN_OFFSET + Math.max(0, paddedDelta)
    );
    pullIndicator.classList.toggle("is-visible", isVisible);
    pullIndicator.classList.toggle("is-ready", !isLoading && !!state?.isReady);
    pullIndicator.classList.toggle("is-loading", isLoading);
    pullIndicator.style.setProperty("--pull-offset", `${clampedOffset}px`);
    if (pullIndicatorLabel) {
      pullIndicatorLabel.textContent = label;
    }
  };

  const resetPullIndicator = () => {
    setPullIndicatorState(
      {
        isActive: false,
        isReady: false,
        label: PULL_LABEL,
        offset: 0,
      },
      0
    );
  };

  const resetPullTransform = () => {
    if (!agendaList) return;
    agendaList.style.transition = "transform 0.2s ease";
    agendaList.style.transform = "translateY(0)";
    window.setTimeout(() => {
      if (!agendaList) return;
      agendaList.style.transition = "";
    }, 220);
  };

  const hideSaveToast = () => {
    if (!saveToast) return;
    saveToast.classList.remove("is-visible");
    if (saveToastTimer) {
      window.clearTimeout(saveToastTimer);
      saveToastTimer = null;
    }
    if (saveToastHideTimer) {
      window.clearTimeout(saveToastHideTimer);
    }
    saveToastHideTimer = window.setTimeout(() => {
      saveToast.classList.add("hidden");
    }, 200);
  };

  const showSaveToast = (targetValue) => {
    if (!saveToast || !saveToastMessage) return;
    saveToastMessage.textContent = buildSaveToastMessage(targetValue);
    saveToast.classList.remove("hidden");
    if (saveToastHideTimer) {
      window.clearTimeout(saveToastHideTimer);
      saveToastHideTimer = null;
    }
    requestAnimationFrame(() => {
      saveToast.classList.add("is-visible");
    });
    if (saveToastTimer) {
      window.clearTimeout(saveToastTimer);
    }
    saveToastTimer = window.setTimeout(() => {
      hideSaveToast();
    }, 3600);
  };

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
      if (pullRefreshInFlight) return;
      if (agendaList.scrollTop > 0) return;
      const touch = event.touches[0];
      pullState = {
        startX: touch.clientX,
        startY: touch.clientY,
      };
      resetPullIndicator();

      const target = event.target.closest(".agenda__check");
      if (!target?.dataset.file) return;
      const item = target.closest(".agenda__item");
      if (!item) return;
      const swipeTouch = event.touches[0];
      swipeState = {
        target,
        item,
        startX: swipeTouch.clientX,
        startY: swipeTouch.clientY,
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

    agendaList.addEventListener(
      "touchmove",
      (event) => {
        if (!pullState || pullRefreshInFlight) return;
        if (agendaList.scrollTop > 0) {
          pullState = null;
          return;
        }
        const touch = event.touches[0];
        const deltaX = touch.clientX - pullState.startX;
        const deltaY = touch.clientY - pullState.startY;
        if (deltaY <= 0) return;
        if (Math.abs(deltaY) <= Math.abs(deltaX) + PULL_REFRESH_SLOP) return;
        event.preventDefault();
        const clamped = Math.min(PULL_REFRESH_MAX, deltaY);
        agendaList.style.transition = "transform 0s";
        agendaList.style.transform = `translateY(${clamped}px)`;
        pullState.deltaX = deltaX;
        pullState.deltaY = deltaY;
        const indicatorState = getPullIndicatorState({
          deltaX,
          deltaY,
          scrollTop: agendaList.scrollTop,
        });
        setPullIndicatorState(indicatorState, deltaY);
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

    agendaList.addEventListener("touchend", async (event) => {
      if (!pullState) return;
      const touch = event.changedTouches?.[0];
      const deltaX =
        touch?.clientX - pullState.startX || pullState.deltaX || 0;
      const deltaY =
        touch?.clientY - pullState.startY || pullState.deltaY || 0;
      const shouldRefresh = shouldTriggerPullRefresh({
        deltaX,
        deltaY,
        scrollTop: agendaList.scrollTop,
      });
      const indicatorState = getPullIndicatorState({
        deltaX,
        deltaY,
        scrollTop: agendaList.scrollTop,
      });
      pullState = null;
      resetPullTransform();
      if (!shouldRefresh || !onPullRefresh || pullRefreshInFlight) {
        resetPullIndicator();
        return;
      }
      pullRefreshInFlight = true;
      setPullIndicatorState(indicatorState, PULL_REFRESH_THRESHOLD);
      try {
        await onPullRefresh();
      } finally {
        pullRefreshInFlight = false;
        resetPullIndicator();
      }
    });

    agendaList.addEventListener("touchcancel", () => {
      if (swipeState?.item) {
        swipeState.item.classList.remove("is-swiping");
        swipeState.item.classList.remove("is-revealed");
        swipeState.target.style.transform = "translateX(0)";
      }
      if (pullState) {
        pullState = null;
        resetPullTransform();
        resetPullIndicator();
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
      const targetValue = taskTargetInput?.value || "inbox.org|Inbox";
      await addTaskItem({
        title: taskTitleInput?.value || "",
        status: taskStatusInput?.value || "TODO",
        date: taskDateInput?.value || "",
        target: targetValue,
      });
      closeTaskModal();
      showSaveToast(targetValue);
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
      closeSettingsSheet?.();
      closeTaskModal();
      hideSaveToast();
    }
  });

  return { openTaskModal, closeTaskModal };
};
