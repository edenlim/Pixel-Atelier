import { state } from "./state.js";
import { renderCanvas } from "./canvas.js";
import { cancelLastChange, recordChange } from "./history.js";

//------- LASSO SELECTION STATE -------

const canvas = document.querySelector("#pixelCanvas");
let lassoGesture = null;

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

export function beginLassoGesture(cell, point, event) {
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
      points: [point],
      previousSelection,
    };
  }

  canvas.setPointerCapture(event.pointerId);
  renderCanvas();
}

export function updateLassoGesture(cell, point) {
  if (!lassoGesture) return;

  if (lassoGesture.mode === "move") {
    moveSelection(
      lassoGesture,
      cell.x - lassoGesture.startCell.x,
      cell.y - lassoGesture.startCell.y,
    );
  } else {
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
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  context.translate(centerX + state.panX, centerY + state.panY);
  context.scale(state.zoom, state.zoom);
  context.translate(-centerX, -centerY);
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

export function finishLassoGesture(finalPoint) {
  if (!lassoGesture) return;

  if (lassoGesture.mode === "draw") {
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

export function cancelLassoGesture() {
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

export function isLassoGestureActive() {
  return lassoGesture !== null;
}
