import { state } from "./state.js";
import { renderCanvas } from "./canvas.js";
import { cancelLastChange, recordChange } from "./history.js";
import { setColor } from "./colors.js";
import { $, clamp, formatToolName } from "./utils.js";
import { setZoomLevel } from "./zoom.js";

const canvas = $("#pixelCanvas");
const activeTouchPointers = new Map();
let pinchActive = false;
let pinchStartDistance = 0;
let pinchStartZoom = 1;
let touchChangeInProgress = false;

//------- TOOL SELECTION -------

export function setTool(tool) {
  state.tool = tool;

  document.querySelectorAll(".tool-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });

  const cursors = {
    eyedropper: "copy",
    bucket: "cell",
    eraser: "cell",
    pencil: "crosshair",
  };
  canvas.style.cursor = cursors[tool] || "crosshair";
  $("#toolStatus").textContent = `${formatToolName(tool)} tool`;
  $("#infoTool").textContent = formatToolName(tool);
}

//------- PIXEL DRAWING HELPERS -------

function getCellFromPointer(event) {
  const bounds = canvas.getBoundingClientRect();
  const x = clamp(
    Math.floor(((event.clientX - bounds.left) / bounds.width) * state.width),
    0,
    state.width - 1,
  );
  const y = clamp(
    Math.floor(((event.clientY - bounds.top) / bounds.height) * state.height),
    0,
    state.height - 1,
  );

  return { x, y, index: y * state.width + x };
}

function drawLine(start, end, paintCell) {
  let x = start.x;
  let y = start.y;
  const deltaX = Math.abs(end.x - start.x);
  const stepX = start.x < end.x ? 1 : -1;
  const deltaY = -Math.abs(end.y - start.y);
  const stepY = start.y < end.y ? 1 : -1;
  let error = deltaX + deltaY;

  while (true) {
    paintCell(x, y);
    if (x === end.x && y === end.y) break;

    const doubledError = 2 * error;
    if (doubledError >= deltaY) {
      error += deltaY;
      x += stepX;
    }
    if (doubledError <= deltaX) {
      error += deltaX;
      y += stepY;
    }
  }
}

function paintCell(x, y) {
  const index = y * state.width + x;
  state.pixels[index] = state.tool === "eraser" ? null : state.color;
}

function floodFill(startIndex) {
  const originalColor = state.pixels[startIndex];
  if (originalColor === state.color) return;

  const pending = [startIndex];
  while (pending.length) {
    const index = pending.pop();
    if (
      index < 0 ||
      index >= state.pixels.length ||
      state.pixels[index] !== originalColor
    ) {
      continue;
    }

    state.pixels[index] = state.color;
    const x = index % state.width;
    if (x > 0) pending.push(index - 1);
    if (x < state.width - 1) pending.push(index + 1);
    pending.push(index - state.width, index + state.width);
  }
}

//------- POINTER EVENT SETUP -------

function updateCursorPosition(cell) {
  $("#cursorStatus").textContent = `${cell.x} , ${cell.y}`;
}

function stopDrawing() {
  state.drawing = false;
  state.lastCell = null;
}

//------- PINCH ZOOM -------

function getTouchDistance() {
  const [first, second] = [...activeTouchPointers.values()];
  if (!first || !second) return 0;
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function beginPinchZoom() {
  if (state.drawing || touchChangeInProgress) {
    stopDrawing();
    cancelLastChange();
    touchChangeInProgress = false;
  }

  pinchActive = true;
  pinchStartDistance = Math.max(getTouchDistance(), 1);
  pinchStartZoom = state.zoom;
}

function updateTouchPointer(event) {
  if (!activeTouchPointers.has(event.pointerId)) return;
  activeTouchPointers.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
  });
}

export function setupTools() {
  document.querySelectorAll(".tool-button").forEach((button) => {
    button.addEventListener("click", () => setTool(button.dataset.tool));
  });

  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();

    if (event.pointerType === "touch") {
      activeTouchPointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
      if (activeTouchPointers.size >= 2) {
        beginPinchZoom();
        return;
      }
    }

    if (pinchActive) return;
    const cell = getCellFromPointer(event);
    updateCursorPosition(cell);

    if (state.tool === "eyedropper") {
      const color = state.pixels[cell.index];
      if (color) setColor(color);
      return;
    }

    recordChange();
    touchChangeInProgress = event.pointerType === "touch";
    if (state.tool === "bucket") {
      floodFill(cell.index);
      renderCanvas();
      return;
    }

    state.drawing = true;
    state.lastCell = cell;
    canvas.setPointerCapture(event.pointerId);
    paintCell(cell.x, cell.y);
    renderCanvas();
  });

  canvas.addEventListener("pointermove", (event) => {
    updateTouchPointer(event);

    if (pinchActive) {
      if (activeTouchPointers.size >= 2 && pinchStartDistance > 0) {
        const pinchRatio = getTouchDistance() / pinchStartDistance;
        setZoomLevel(pinchStartZoom * pinchRatio);
      }
      return;
    }

    const cell = getCellFromPointer(event);
    updateCursorPosition(cell);

    if (state.drawing && state.lastCell) {
      drawLine(state.lastCell, cell, paintCell);
      state.lastCell = cell;
      renderCanvas();
    }
  });

  canvas.addEventListener("pointerup", (event) => {
    if (event.pointerType === "touch") {
      activeTouchPointers.delete(event.pointerId);
      if (pinchActive) {
        if (activeTouchPointers.size === 0) {
          pinchActive = false;
          pinchStartDistance = 0;
        }
        return;
      }
      touchChangeInProgress = false;
    }
    stopDrawing();
  });

  canvas.addEventListener("pointercancel", (event) => {
    if (event.pointerType === "touch") {
      activeTouchPointers.delete(event.pointerId);
      touchChangeInProgress = false;
      if (activeTouchPointers.size === 0) {
        pinchActive = false;
        pinchStartDistance = 0;
      }
    }
    stopDrawing();
  });
  canvas.addEventListener("pointerleave", () => {
    if (!state.drawing) $("#cursorStatus").textContent = "— , —";
  });
}
