import { $ } from "./utils.js";

const storageKey = "pixel-atelier-theme";

//------- THEME SETUP -------

export function setupThemeToggle() {
  const toggle = $("#themeToggle");
  const savedTheme = readSavedTheme();
  const initialTheme =
    savedTheme || document.documentElement.dataset.theme || "light";

  applyTheme(initialTheme, toggle, false);
  toggle.addEventListener("click", () => {
    const nextTheme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme, toggle);
  });
}

//------- THEME STATE -------

function readSavedTheme() {
  try {
    const theme = localStorage.getItem(storageKey);
    return theme === "light" || theme === "dark" ? theme : null;
  } catch {
    return null;
  }
}

function applyTheme(theme, toggle, persist = true) {
  const isDark = theme === "dark";
  const previousTheme = document.documentElement.dataset.theme || "light";
  document.documentElement.dataset.theme = theme;
  toggle.setAttribute("aria-pressed", String(isDark));
  toggle.setAttribute(
    "aria-label",
    `Switch to ${isDark ? "light" : "dark"} mode`,
  );
  toggle.title = `Switch to ${isDark ? "light" : "dark"} mode`;
  $("meta[name='theme-color']").content = isDark ? "#191b18" : "#f4f2ec";
  if (previousTheme !== theme) {
    document.dispatchEvent(new CustomEvent("pixelatelier:themechange"));
  }

  if (!persist) return;

  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // The toggle still works for this session if browser storage is unavailable.
  }
}
