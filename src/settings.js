const SETTINGS_KEY = "org-tides-settings";

const normalizePathDepthSetting = (value) => {
  if (!value || value === "all") return "all";
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return "all";
  return String(parsed);
};

const getPathDepthOptions = (pathDepthOptions) =>
  Array.from(pathDepthOptions?.querySelectorAll?.("[data-path-depth]") || []);

export const setPathDepthSelection = (pathDepthOptions, value) => {
  const options = getPathDepthOptions(pathDepthOptions);
  if (!options.length) return null;

  const normalized = normalizePathDepthSetting(value);
  let selected = options.find((option) => option.dataset.pathDepth === normalized);
  if (!selected) {
    selected = options[0];
  }

  options.forEach((option) => {
    const isSelected = option === selected;
    option.classList?.toggle("is-selected", isSelected);
    option.setAttribute?.("aria-checked", isSelected ? "true" : "false");
    option.tabIndex = isSelected ? 0 : -1;
  });

  return selected.dataset.pathDepth;
};

export const normalizeSettings = (settings = {}) => ({
  pathDepth: normalizePathDepthSetting(settings.pathDepth),
});

export const loadSettings = () => {
  if (typeof window === "undefined" || !window.localStorage) {
    return normalizeSettings();
  }
  try {
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    if (!stored) {
      return normalizeSettings();
    }
    const parsed = JSON.parse(stored);
    return normalizeSettings(parsed);
  } catch (error) {
    console.warn("Failed to load settings", error);
    return normalizeSettings();
  }
};

export const saveSettings = (settings = {}) => {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const payload = normalizeSettings(settings);
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to save settings", error);
  }
};

export const parsePathDepth = (value) => {
  if (!value || value === "all") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 1 ? null : parsed;
};

export const findCloseSettingsTarget = (target) => {
  let node = target;
  while (node) {
    if (node.dataset?.closeSettings) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
};

export const findPathDepthOption = (target, container) => {
  let node = target;
  while (node) {
    if (node.dataset?.pathDepth) {
      return node;
    }
    if (node === container) {
      break;
    }
    node = node.parentElement;
  }
  return null;
};

export const initSettings = ({
  settingsButton,
  settingsSheet,
  pathDepthOptions,
  onChange,
}) => {
  const applyPathDepthChange = (nextValue) => {
    const nextSelection = setPathDepthSelection(pathDepthOptions, nextValue);
    if (onChange && nextSelection) {
      onChange(nextSelection);
    }
  };

  const openSettingsSheet = () => {
    if (!settingsSheet) return;
    settingsSheet.classList.remove("hidden");
    const selectedOption =
      pathDepthOptions?.querySelector(".settings-field__option.is-selected") ||
      pathDepthOptions?.querySelector("[data-path-depth]");
    selectedOption?.focus();
  };

  const closeSettingsSheet = () => {
    if (!settingsSheet) return;
    settingsSheet.classList.add("hidden");
  };

  if (settingsButton) {
    settingsButton.addEventListener("click", () => {
      openSettingsSheet();
    });
  }

  if (settingsSheet) {
    settingsSheet.addEventListener("click", (event) => {
      if (findCloseSettingsTarget(event.target)) {
        closeSettingsSheet();
      }
    });
  }

  if (pathDepthOptions) {
    pathDepthOptions.addEventListener("click", (event) => {
      const option = findPathDepthOption(event.target, pathDepthOptions);
      if (!option) return;
      applyPathDepthChange(option.dataset.pathDepth);
    });

    pathDepthOptions.addEventListener("keydown", (event) => {
      const option = findPathDepthOption(event.target, pathDepthOptions);
      if (!option) return;
      const options = getPathDepthOptions(pathDepthOptions);
      if (!options.length) return;
      const currentIndex = options.indexOf(option);
      let nextIndex = currentIndex;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          nextIndex = (currentIndex + 1) % options.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          nextIndex = (currentIndex - 1 + options.length) % options.length;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = options.length - 1;
          break;
        case " ":
        case "Enter":
          event.preventDefault();
          applyPathDepthChange(option.dataset.pathDepth);
          return;
        default:
          return;
      }

      event.preventDefault();
      const nextOption = options[nextIndex];
      applyPathDepthChange(nextOption.dataset.pathDepth);
      nextOption.focus();
    });
  }

  return { openSettingsSheet, closeSettingsSheet };
};
