import { palette, state } from "./state.js";
import { $ } from "./utils.js";

const swatches = $("#swatches");
const paletteStorageKey = "pixel-atelier-palette";
const legacyStorageKey = "pixel-atelier-custom-swatches";
const selectedSwatches = new Set();
let addSwatchButton;
let paletteAction;
let editing = false;
let holdTimer;
let holdStartPoint = null;
let draggedSwatch = null;
let suppressClick = false;

//------- ACTIVE COLOR AND PALETTE SETUP -------

export function setColor(color) {
  state.color = color;
  $("#currentChip").style.background = color;
  $("#currentHex").textContent = color.toUpperCase();
  $("#customColor").value = color;

  document.querySelectorAll(".swatch").forEach((swatch) => {
    swatch.classList.toggle(
      "active",
      swatch.dataset.color?.toLowerCase() === color.toLowerCase(),
    );
  });
}

export function setupColors() {
  paletteAction = $("#paletteAction");

  const savedPalette = getSavedPalette();
  const startingColors = savedPalette ?? [
    ...palette,
    ...getLegacyCustomColors(),
  ];

  startingColors.forEach((color, index) => {
    addSwatch(color, {
      isInitialSelection: savedPalette === null && index === 0,
      isCustom: !palette.includes(color),
      isRemovable: true,
    });
  });

  addSwatchButton = createAddSwatchButton();
  swatches.append(addSwatchButton);

  $("#customColor").addEventListener("input", (event) => {
    setColor(event.target.value);
  });

  paletteAction.addEventListener("click", handlePaletteAction);
  setupAddSwatchDialog();
  const activeSwatch = findSwatch(state.color);
  const fallbackSwatch = swatches.querySelector(".swatch[data-color]");
  const startingColor = activeSwatch
    ? state.color
    : (fallbackSwatch?.dataset.color ?? state.color);
  setColor(startingColor);
  savePalette();
}

//------- SWATCH CREATION -------

function addSwatch(color, options = {}) {
  const existing = findSwatch(color);
  if (existing) {
    if (options.isInitialSelection) existing.classList.add("active");
    return existing;
  }

  const swatch = document.createElement("button");
  swatch.className = "swatch";
  swatch.type = "button";
  swatch.dataset.color = color;
  swatch.title = color.toUpperCase();
  swatch.setAttribute("aria-label", `Select ${color.toUpperCase()}`);
  swatch.style.background = color;

  if (options.isInitialSelection) swatch.classList.add("active");
  if (options.isCustom) {
    swatch.classList.add("swatch-custom");
  }
  if (options.isRemovable) {
    swatch.dataset.removable = "true";
  }

  swatch.addEventListener("click", () => handleSwatchClick(swatch, color));
  if (options.isRemovable) addLongPressBehavior(swatch, color);

  if (addSwatchButton) {
    swatches.insertBefore(swatch, addSwatchButton);
  } else {
    swatches.append(swatch);
  }

  return swatch;
}

function findSwatch(color) {
  return [...swatches.querySelectorAll(".swatch")].find(
    (swatch) => swatch.dataset.color?.toLowerCase() === color.toLowerCase(),
  );
}

function createAddSwatchButton() {
  const button = document.createElement("button");
  button.className = "swatch swatch-add";
  button.type = "button";
  button.textContent = "+";
  button.title = "Add a color swatch";
  button.setAttribute("aria-label", "Add a color swatch");
  button.addEventListener("click", openAddSwatchDialog);
  return button;
}

//------- ADD-SWATCH DIALOG -------

function setupAddSwatchDialog() {
  const dialog = $("#colorDialog");
  const colorPicker = $("#swatchColorPicker");
  const heading = $("#choose-color-text");

  colorPicker.addEventListener("input", () => {
    heading.style.color = colorPicker.value;
  });

  $("#confirmColor").addEventListener("click", () => {
    const color = colorPicker.value.toLowerCase();
    const swatch = addSwatch(color, { isCustom: true, isRemovable: true });
    savePalette();
    setColor(color);
    exitEditMode();
    dialog.close();
    swatch.focus();
  });

  $("#cancelColor").addEventListener("click", () => dialog.close());
}

function openAddSwatchDialog() {
  if (editing) return;

  const colorPicker = $("#swatchColorPicker");
  colorPicker.value = state.color;
  $("#choose-color-text").style.color = colorPicker.value;

  $("#colorDialog").showModal();
}

//------- PALETTE EDIT MODE -------

function handlePaletteAction() {
  if (!editing) {
    enterEditMode();
    return;
  }

  if (selectedSwatches.size) {
    removeSelectedSwatches();
  } else {
    exitEditMode();
  }
}

function enterEditMode() {
  editing = true;
  swatches.classList.add("is-editing");
  paletteAction.classList.add("is-editing", "is-trash");
  paletteAction.setAttribute("aria-label", "Delete selected swatches");
  renderTrashButton();
}

function exitEditMode() {
  editing = false;
  draggedSwatch = null;
  selectedSwatches.clear();
  swatches.classList.remove("is-editing");
  swatches.querySelectorAll(".is-selected").forEach((swatch) => {
    swatch.classList.remove("is-selected");
  });
  paletteAction.classList.remove("is-editing", "is-trash", "drop-target");
  paletteAction.setAttribute("aria-label", "Edit custom swatches");
  paletteAction.textContent = "Edit";
}

function renderTrashButton() {
  const count = selectedSwatches.size;
  paletteAction.innerHTML = `
    <svg viewBox="0 0 15 15" aria-hidden="true">
      <path d="M4.5 3V1.5C4.5 0.947715 4.94772 0.5 5.5 0.5H9.5C10.0523 0.5 10.5 0.947715 10.5 1.5V3M0 3.5H15M1.5 3.5V13.5C1.5 14.0523 1.94772 14.5 2.5 14.5H12.5C13.0523 14.5 13.5 14.0523 13.5 13.5V3.5M7.5 7V12M4.5 9V12M10.5 9V12" />
    </svg>
    <span>${count || ""}</span>
  `;
  paletteAction.disabled = false;
  paletteAction.setAttribute(
    "aria-label",
    count ? `Delete ${count} selected swatches` : "Done editing swatches",
  );
  paletteAction.title = count
    ? `Delete ${count} selected swatch${count === 1 ? "" : "es"}`
    : "Done editing swatches";
}

//------- SWATCH SELECTION -------

function handleSwatchClick(swatch, color) {
  if (suppressClick) {
    suppressClick = false;
    return;
  }

  if (swatch.dataset.removable === "true" && editing) {
    toggleSwatchSelection(swatch, color);
    return;
  }

  if (!editing) setColor(color);
}

function toggleSwatchSelection(swatch, color) {
  if (selectedSwatches.has(color)) {
    selectedSwatches.delete(color);
    swatch.classList.remove("is-selected");
  } else {
    selectedSwatches.add(color);
    swatch.classList.add("is-selected");
  }

  renderTrashButton();
}

//------- LONG-PRESS AND DRAG -------

function addLongPressBehavior(swatch, color) {
  swatch.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    holdStartPoint = { x: event.clientX, y: event.clientY };

    if (editing && selectedSwatches.has(color)) {
      holdTimer = window.setTimeout(() => {
        holdTimer = null;
        holdStartPoint = null;
        startDragging(swatch, event);
      }, 450);
      return;
    }

    holdTimer = window.setTimeout(() => {
      holdTimer = null;
      holdStartPoint = null;
      if (!editing) enterEditMode();
      selectedSwatches.add(color);
      swatch.classList.add("is-selected");
      renderTrashButton();
      startDragging(swatch, event);
      suppressClick = true;
    }, 500);
  });

  swatch.addEventListener("pointerup", () => {
    window.clearTimeout(holdTimer);
    holdTimer = null;
    holdStartPoint = null;
    if (suppressClick) {
      window.setTimeout(() => {
        suppressClick = false;
      }, 0);
    }
  });
  swatch.addEventListener("pointercancel", () => {
    window.clearTimeout(holdTimer);
    holdTimer = null;
    holdStartPoint = null;
    draggedSwatch = null;
    paletteAction.classList.remove("drop-target");
  });
  swatch.addEventListener("pointermove", (event) => {
    if (
      holdTimer &&
      holdStartPoint &&
      Math.hypot(
        event.clientX - holdStartPoint.x,
        event.clientY - holdStartPoint.y,
      ) > 8
    ) {
      window.clearTimeout(holdTimer);
      holdTimer = null;
      holdStartPoint = null;
    }
    if (draggedSwatch === swatch) updateDropTarget(event);
  });
  swatch.addEventListener("lostpointercapture", finishDragging);
  swatch.addEventListener("pointerup", finishDragging);
}

function startDragging(swatch, event) {
  draggedSwatch = swatch;
  suppressClick = true;
  swatch.setPointerCapture(event.pointerId);
  updateDropTarget(event);
}

function updateDropTarget(event) {
  const bounds = paletteAction.getBoundingClientRect();
  const isOverTrash =
    event.clientX >= bounds.left &&
    event.clientX <= bounds.right &&
    event.clientY >= bounds.top &&
    event.clientY <= bounds.bottom;

  paletteAction.classList.toggle("drop-target", isOverTrash);
}

function finishDragging(event) {
  if (!draggedSwatch) return;

  const bounds = paletteAction.getBoundingClientRect();
  const droppedOnTrash =
    event.clientX >= bounds.left &&
    event.clientX <= bounds.right &&
    event.clientY >= bounds.top &&
    event.clientY <= bounds.bottom;

  if (droppedOnTrash && selectedSwatches.size) removeSelectedSwatches();
  draggedSwatch = null;
  paletteAction.classList.remove("drop-target");
}

//------- SWATCH REMOVAL AND STORAGE -------

function removeSelectedSwatches() {
  const removingCurrentColor = selectedSwatches.has(state.color);

  swatches
    .querySelectorAll('.swatch[data-removable="true"]')
    .forEach((swatch) => {
      if (selectedSwatches.has(swatch.dataset.color)) swatch.remove();
    });

  savePalette();
  if (removingCurrentColor) {
    const nextSwatch = swatches.querySelector(".swatch[data-color]");
    if (nextSwatch) setColor(nextSwatch.dataset.color);
  }
  exitEditMode();
}

function getSavedPalette() {
  try {
    const saved = localStorage.getItem(paletteStorageKey);
    if (saved === null) return null;

    const colors = JSON.parse(saved);
    if (!Array.isArray(colors)) return null;
    return colors.filter((color) => isValidColor(color));
  } catch {
    return null;
  }
}

function getLegacyCustomColors() {
  try {
    const saved = JSON.parse(localStorage.getItem(legacyStorageKey) || "[]");
    return Array.isArray(saved)
      ? saved.filter((color) => isValidColor(color))
      : [];
  } catch {
    return [];
  }
}

function isValidColor(color) {
  return typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color);
}

function savePalette() {
  const colors = [...swatches.querySelectorAll(".swatch[data-color]")].map(
    (swatch) => swatch.dataset.color,
  );

  try {
    localStorage.setItem(paletteStorageKey, JSON.stringify(colors));
  } catch {
    // The palette still works for this session if browser storage is unavailable.
  }
}
