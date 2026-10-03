//------- PALETTE PERSISTENCE -------

const paletteStorageKey = "pixel-atelier-palette";
const legacyStorageKey = "pixel-atelier-custom-swatches";

export function loadSavedPalette() {
  try {
    const saved = localStorage.getItem(paletteStorageKey);
    if (saved === null) return null;

    const colors = JSON.parse(saved);
    if (!Array.isArray(colors)) return null;
    return colors.filter(isValidColor);
  } catch {
    return null;
  }
}

export function loadLegacyCustomColors() {
  try {
    const saved = JSON.parse(localStorage.getItem(legacyStorageKey) || "[]");
    return Array.isArray(saved) ? saved.filter(isValidColor) : [];
  } catch {
    return [];
  }
}

function isValidColor(color) {
  return typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color);
}

export function savePalette(colors) {
  try {
    localStorage.setItem(paletteStorageKey, JSON.stringify(colors));
  } catch {
    // The palette still works for this session if browser storage is unavailable.
  }
}
