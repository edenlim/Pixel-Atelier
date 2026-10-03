import { MAX_CANVAS_DIMENSION, state } from "./state.js";
import { recordChange } from "./history.js";
import { renderCanvas } from "./canvas.js";
import { $, showToast } from "./utils.js";
import { createResizedPixels } from "./resize-algorithms.js";

//------- DIMENSION DISPLAY -------

function updateSizeControls() {
  $("#widthInput").value = state.width;
  $("#heightInput").value = state.height;
  $("#infoDimensions").textContent = `${state.width} × ${state.height}`;
}

//------- CANVAS RESIZING -------

function resizeCanvas(width, height, mode = "expand") {
  width = Math.round(Number(width));
  height = Math.round(Number(height));

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 1 ||
    height < 1 ||
    width > MAX_CANVAS_DIMENSION ||
    height > MAX_CANVAS_DIMENSION
  ) {
    showToast(`Choose dimensions between 1 and ${MAX_CANVAS_DIMENSION} pixels.`);
    return false;
  }

  const oldWidth = state.width;
  const oldHeight = state.height;
  const oldPixels = state.pixels.slice();
  const newPixels = createResizedPixels(
    oldPixels,
    oldWidth,
    oldHeight,
    width,
    height,
    mode,
  );

  recordChange();
  state.width = width;
  state.height = height;
  state.pixels = newPixels;
  state.selection = null;
  updateSizeControls();
  renderCanvas();
  $("#saveStatus").textContent = "Changes saved just now";
  return true;
}

//------- RESIZE DIALOG -------

let aspectRatioLocked = true;
let lockedAspectRatio = state.width / state.height;
let lastEditedDimension = "width";

function openResizeDialog(width = state.width, height = state.height) {
  $("#widthInput").value = width;
  $("#heightInput").value = height;
  lockedAspectRatio = width / height;
  updateAspectRatioLockButton();
  $("#resizeDialog").showModal();
}

function updateAspectRatioLockButton() {
  const button = $("#aspectRatioLock");
  button.classList.toggle("is-locked", aspectRatioLocked);
  button.setAttribute("aria-pressed", String(aspectRatioLocked));
  button.setAttribute(
    "aria-label",
    aspectRatioLocked ? "Unlock aspect ratio" : "Lock aspect ratio",
  );
  button.title = aspectRatioLocked ? "Unlock aspect ratio" : "Lock aspect ratio";
}

function updatePairedDimension(changedDimension) {
  if (!aspectRatioLocked) return;

  const widthInput = $("#widthInput");
  const heightInput = $("#heightInput");
  const width = Number(widthInput.value);
  const height = Number(heightInput.value);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return;

  if (changedDimension === "width") {
    heightInput.value = Math.min(
      MAX_CANVAS_DIMENSION,
      Math.max(1, Math.round(width / lockedAspectRatio)),
    );
  } else {
    widthInput.value = Math.min(
      MAX_CANVAS_DIMENSION,
      Math.max(1, Math.round(height * lockedAspectRatio)),
    );
  }
}

function setupAspectRatioLock() {
  const widthInput = $("#widthInput");
  const heightInput = $("#heightInput");

  widthInput.addEventListener("input", () => {
    lastEditedDimension = "width";
    updatePairedDimension("width");
  });
  heightInput.addEventListener("input", () => {
    lastEditedDimension = "height";
    updatePairedDimension("height");
  });

  $("#aspectRatioLock").addEventListener("click", () => {
    aspectRatioLocked = !aspectRatioLocked;
    if (aspectRatioLocked) {
      const width = Number(widthInput.value);
      const height = Number(heightInput.value);
      if (width > 0 && height > 0) {
        lockedAspectRatio = width / height;
        updatePairedDimension(lastEditedDimension);
      }
    }
    updateAspectRatioLockButton();
  });
}

function applyResizeDialog() {
  const mode = document.querySelector('input[name="resizeMode"]:checked').value;
  const didResize = resizeCanvas(
    $("#widthInput").value,
    $("#heightInput").value,
    mode,
  );
  if (!didResize) return;

  $("#resizeDialog").close();
  showToast(
    mode === "scale"
      ? "Canvas resized and artwork scaled."
      : "Canvas expanded; artwork kept its pixel size.",
  );
}

function setupResizeModeOptions() {
  document.querySelectorAll('input[name="resizeMode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      document.querySelectorAll(".resize-option").forEach((option) => {
        option.classList.toggle(
          "selected",
          option.querySelector("input").checked,
        );
      });

      $("#resizeHint").textContent =
        radio.value === "scale"
          ? "Your drawing grows or shrinks proportionally to fill the new canvas."
          : "Your drawing stays the same size, with extra room around it.";
    });
  });
}

//------- RESIZE EVENT SETUP -------

export function setupResizeControls() {
  const resizeDialog = $("#resizeDialog");
  const customDialog = $("#customDialog");

  $("#resizeBtn").addEventListener("click", () => openResizeDialog());
  $("#resizeTipBtn").addEventListener("click", () => openResizeDialog());
  $("#cancelResize").addEventListener("click", () => resizeDialog.close());
  $("#applyResize").addEventListener("click", applyResizeDialog);
  $("#cancelCustom").addEventListener("click", () => {
    customDialog.close();
    updateSizeControls();
  });
  $("#applyCustom").addEventListener("click", () => {
    const didResize = resizeCanvas(
      $("#customWidth").value,
      $("#customHeight").value,
    );
    if (!didResize) return;

    customDialog.close();
    showToast("New canvas created.");
  });

  setupResizeModeOptions();
  setupAspectRatioLock();
  updateSizeControls();
}

export function refreshSizeControls() {
  updateSizeControls();
}
