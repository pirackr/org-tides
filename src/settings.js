const SETTINGS_KEY = "org-tides-settings";

const normalizePathDepthSetting = (value) => {
  if (!value || value === "all") return "all";
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return "all";
  return String(parsed);
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

export const initSettings = ({
  settingsButton,
  settingsSheet,
  pathDepthSelect,
  onChange,
}) => {
  const openSettingsSheet = () => {
    if (!settingsSheet) return;
    settingsSheet.classList.remove("hidden");
    pathDepthSelect?.focus();
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
      if (event.target?.dataset?.closeSettings) {
        closeSettingsSheet();
      }
    });
  }

  if (pathDepthSelect) {
    pathDepthSelect.addEventListener("change", (event) => {
      const nextValue = normalizePathDepthSetting(event.target.value);
      pathDepthSelect.value = nextValue;
      if (onChange) {
        onChange(nextValue);
      }
    });
  }

  return { openSettingsSheet, closeSettingsSheet };
};
