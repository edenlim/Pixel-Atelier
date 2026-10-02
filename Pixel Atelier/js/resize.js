import { state } from "./state.js";
import { recordChange } from "./history.js";
import { renderCanvas } from "./canvas.js";
import { $, showToast } from "./utils.js";

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
    width > 128 ||
    height > 128
  ) {
    showToast("Choose dimensions between 1 and 128 pixels.");
    return false;
  }

  const oldWidth = state.width;
  const oldHeight = state.height;
  const oldPixels = state.pixels.slice();
  const newPixels = Array(width * height).fill(null);

  if (mode === "scale") {
    scaleArtwork(oldPixels, oldWidth, oldHeight, newPixels, width, height);
  } else {
    expandCanvas(oldPixels, oldWidth, oldHeight, newPixels, width, height);
  }

  recordChange();
  state.width = width;
  state.height = height;
  state.pixels = newPixels;
  updateSizeControls();
  renderCanvas();
  $("#saveStatus").textContent = "Changes saved just now";
  return true;
}

function scaleArtwork(
  oldPixels,
  oldWidth,
  oldHeight,
  newPixels,
  newWidth,
  newHeight,
) {
  for (let y = 0; y < newHeight; y += 1) {
    for (let x = 0; x < newWidth; x += 1) {
      const sourceX = Math.min(
        oldWidth - 1,
        Math.floor((x * oldWidth) / newWidth),
      );
      const sourceY = Math.min(
        oldHeight - 1,
        Math.floor((y * oldHeight) / newHeight),
      );
      newPixels[y * newWidth + x] = oldPixels[sourceY * oldWidth + sourceX];
    }
  }
}

function expandCanvas(
  oldPixels,
  oldWidth,
  oldHeight,
  newPixels,
  newWidth,
  newHeight,
) {
  const offsetX = Math.floor((newWidth - oldWidth) / 2);
  const offsetY = Math.floor((newHeight - oldHeight) / 2);

  for (let y = 0; y < oldHeight; y += 1) {
    for (let x = 0; x < oldWidth; x += 1) {
      const targetX = x + offsetX;
      const targetY = y + offsetY;
      if (
        targetX < 0 ||
        targetX >= newWidth ||
        targetY < 0 ||
        targetY >= newHeight
      ) {
        continue;
      }
      newPixels[targetY * newWidth + targetX] = oldPixels[y * oldWidth + x];
    }
  }
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
    heightInput.value = Math.min(128, Math.max(1, Math.round(width / lockedAspectRatio)));
  } else {
    widthInput.value = Math.min(128, Math.max(1, Math.round(height * lockedAspectRatio)));
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
