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
let lassoGesture = null;

//------- TOOL SELECTION -------

export function setTool(tool) {
  if (tool !== "lasso" && state.selection) {
    state.selection = null;
    renderCanvas();
  }

  state.tool = tool;

  document.querySelectorAll(".tool-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });
  $("#brushSizeControl").hidden = !["pencil", "eraser"].includes(tool);

  const cursors = {
    eyedropper: "copy",
    bucket: "cell",
    eraseFill: "cell",
    eraser: "cell",
    pencil: "crosshair",
    lasso: "crosshair",
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

function getCanvasPointFromPointer(event) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: clamp(
      ((event.clientX - bounds.left) / bounds.width) * state.width,
      0,
      state.width,
    ),
    y: clamp(
      ((event.clientY - bounds.top) / bounds.height) * state.height,
      0,
      state.height,
    ),
  };
}

function cloneSelection(selection) {
  if (!selection) return null;
  return {
    points: selection.points.map((point) => ({ ...point })),
    cells: selection.cells.slice(),
  };
}

function isPointInPolygon(x, y, points) {
  let inside = false;
  for (
    let current = 0, previous = points.length - 1;
    current < points.length;
    previous = current++
  ) {
    const currentPoint = points[current];
    const previousPoint = points[previous];
    const crosses =
      currentPoint.y > y !== previousPoint.y > y &&
      x <
        ((previousPoint.x - currentPoint.x) * (y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function makeSelection(points) {
  if (points.length < 3) return null;

  const cells = [];
  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      if (isPointInPolygon(x + 0.5, y + 0.5, points)) {
        cells.push(y * state.width + x);
      }
    }
  }

  return cells.length ? { points, cells } : null;
}

function translateSelection(selection, deltaX, deltaY) {
  const cells = [];
  for (const index of selection.cells) {
    const x = (index % state.width) + deltaX;
    const y = Math.floor(index / state.width) + deltaY;
    if (x >= 0 && x < state.width && y >= 0 && y < state.height) {
      cells.push(y * state.width + x);
    }
  }

  return {
    points: selection.points.map((point) => ({
      x: point.x + deltaX,
      y: point.y + deltaY,
    })),
    cells,
  };
}

function moveSelection(gesture, deltaX, deltaY) {
  if (!deltaX && !deltaY) return;
  if (!gesture.didMove) {
    recordChange();
    gesture.didMove = true;
  }

  const nextPixels = gesture.originalPixels.slice();
  for (const index of gesture.originalSelection.cells) {
    nextPixels[index] = null;
  }

  for (const index of gesture.originalSelection.cells) {
    const color = gesture.originalPixels[index];
    if (!color) continue;

    const x = (index % state.width) + deltaX;
    const y = Math.floor(index / state.width) + deltaY;
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) continue;
    nextPixels[y * state.width + x] = color;
  }

  state.pixels = nextPixels;
  state.selection = translateSelection(
    gesture.originalSelection,
    deltaX,
    deltaY,
  );
}

function beginLassoGesture(cell, event) {
  const previousSelection = cloneSelection(state.selection);
  const selectedCells = new Set(state.selection?.cells ?? []);

  if (selectedCells.has(cell.index)) {
    lassoGesture = {
      mode: "move",
      startCell: cell,
      originalPixels: state.pixels.slice(),
      originalSelection: previousSelection,
      previousSelection,
      didMove: false,
    };
  } else {
    state.selection = null;
    lassoGesture = {
      mode: "draw",
      points: [getCanvasPointFromPointer(event)],
      previousSelection,
    };
  }

  canvas.setPointerCapture(event.pointerId);
  renderCanvas();
}

function updateLassoGesture(cell, event) {
  if (!lassoGesture) return;

  if (lassoGesture.mode === "move") {
    moveSelection(
      lassoGesture,
      cell.x - lassoGesture.startCell.x,
      cell.y - lassoGesture.startCell.y,
    );
  } else {
    const point = getCanvasPointFromPointer(event);
    const previous = lassoGesture.points.at(-1);
    if (
      Math.hypot(point.x - previous.x, point.y - previous.y) >= 0.2
    ) {
      lassoGesture.points.push(point);
    }
  }

  renderCanvas();
  if (lassoGesture.mode === "draw") {
    drawOpenLassoOutline(lassoGesture.points);
  }
}

function drawOpenLassoOutline(points) {
  const rect = canvas.getBoundingClientRect();
  const context = canvas.getContext("2d");
  const pixelRatio = window.devicePixelRatio || 1;

  context.save();
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.beginPath();
  points.forEach((point, index) => {
    const x = (point.x / state.width) * rect.width;
    const y = (point.y / state.height) * rect.height;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.setLineDash([3, 2]);
  context.lineWidth = 1.5;
  context.strokeStyle =
    document.documentElement.dataset.theme === "dark" ? "#ffffff" : "#292b26";
  context.stroke();
  context.restore();
}

function finishLassoGesture(event) {
  if (!lassoGesture) return;

  if (lassoGesture.mode === "draw") {
    const finalPoint = getCanvasPointFromPointer(event);
    const previous = lassoGesture.points.at(-1);
    if (
      Math.hypot(finalPoint.x - previous.x, finalPoint.y - previous.y) >= 0.2
    ) {
      lassoGesture.points.push(finalPoint);
    }
    state.selection = makeSelection(lassoGesture.points);
  }

  lassoGesture = null;
  renderCanvas();
}

function cancelLassoGesture() {
  if (!lassoGesture) return;
  if (lassoGesture.didMove) cancelLastChange();
  state.selection = cloneSelection(lassoGesture.previousSelection);
  lassoGesture = null;
  renderCanvas();
}

export function clearSelection() {
  if (!state.selection) return;
  state.selection = null;
  renderCanvas();
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
  const offset = Math.floor((1 - state.brushSize) / 2);
  const replacement = state.tool === "eraser" ? null : state.color;

  for (let brushY = 0; brushY < state.brushSize; brushY += 1) {
    for (let brushX = 0; brushX < state.brushSize; brushX += 1) {
      const targetX = x + offset + brushX;
      const targetY = y + offset + brushY;
      if (
        targetX < 0 ||
        targetX >= state.width ||
        targetY < 0 ||
        targetY >= state.height
      ) {
        continue;
      }
      state.pixels[targetY * state.width + targetX] = replacement;
    }
  }
}

function floodFill(startIndex, replacementColor) {
  const originalColor = state.pixels[startIndex];
  if (originalColor === replacementColor) return;

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

    state.pixels[index] = replacementColor;
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
  cancelLassoGesture();
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
  const brushSizeInput = $("#brushSizeInput");
  const brushSizeValue = $("#brushSizeValue");

  brushSizeInput.addEventListener("input", () => {
    state.brushSize = Number(brushSizeInput.value);
    brushSizeValue.value = `${state.brushSize} × ${state.brushSize} px`;
    brushSizeValue.textContent = brushSizeValue.value;
  });
  setTool(state.tool);

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

    if (state.tool === "lasso") {
      beginLassoGesture(cell, event);
      return;
    }

    if (state.tool === "eyedropper") {
      const color = state.pixels[cell.index];
      if (color) setColor(color);
      return;
    }

    recordChange();
    touchChangeInProgress = event.pointerType === "touch";
    if (state.tool === "bucket" || state.tool === "eraseFill") {
      floodFill(cell.index, state.tool === "eraseFill" ? null : state.color);
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

    if (lassoGesture) {
      updateLassoGesture(cell, event);
      return;
    }

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
    finishLassoGesture(event);
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
    cancelLassoGesture();
    stopDrawing();
  });
  canvas.addEventListener("pointerleave", () => {
    if (!state.drawing) $("#cursorStatus").textContent = "— , —";
  });
}
