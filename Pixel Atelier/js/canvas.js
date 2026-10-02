import { state } from "./state.js";
import { $, formatToolName } from "./utils.js";

const canvas = $("#pixelCanvas");
const context = canvas.getContext("2d");
const preview = $("#previewCanvas");
const previewContext = preview.getContext("2d");
const canvasWrap = $("#canvasWrap");

//------- CANVAS RENDERING -------

export function renderCanvas() {
  const rect = canvasWrap.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;

  canvas.width = Math.max(1, Math.round(rect.width * pixelRatio));
  canvas.height = Math.max(1, Math.round(rect.height * pixelRatio));
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);

  const cellWidth = rect.width / state.width;
  const cellHeight = rect.height / state.height;

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const color = state.pixels[y * state.width + x];
      if (!color) continue;

      context.fillStyle = color;
      context.fillRect(
        x * cellWidth,
        y * cellHeight,
        cellWidth + 0.2,
        cellHeight + 0.2,
      );
    }
  }

  if (state.grid && cellWidth >= 4 && cellHeight >= 4) {
    drawGrid(rect.width, rect.height, cellWidth, cellHeight);
  }

  renderPreview();
  updateCanvasInfo();
  drawCoordinates();
}

//------- GRID OVERLAY -------

function drawGrid(width, height, cellWidth, cellHeight) {
  context.beginPath();
  context.strokeStyle =
    document.documentElement.dataset.theme === "dark"
      ? "rgba(225, 226, 216, 0.18)"
      : "rgba(65, 68, 60, 0.14)";
  context.lineWidth = 1;

  for (let x = 0; x <= state.width; x += 1) {
    const position = Math.round(x * cellWidth) + 0.5;
    context.moveTo(position, 0);
    context.lineTo(position, height);
  }

  for (let y = 0; y <= state.height; y += 1) {
    const position = Math.round(y * cellHeight) + 0.5;
    context.moveTo(0, position);
    context.lineTo(width, position);
  }

  context.stroke();
}

//------- LIVE PREVIEW -------

function renderPreview() {
  const size = 160;
  const pixelRatio = window.devicePixelRatio || 1;
  const cellWidth = size / state.width;
  const cellHeight = size / state.height;

  preview.width = size * pixelRatio;
  preview.height = size * pixelRatio;
  previewContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  previewContext.clearRect(0, 0, size, size);

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const color = state.pixels[y * state.width + x];
      if (!color) continue;

      previewContext.fillStyle = color;
      previewContext.fillRect(
        x * cellWidth,
        y * cellHeight,
        cellWidth + 0.1,
        cellHeight + 0.1,
      );
    }
  }
}

//------- CANVAS LABELS AND COORDINATES -------

function updateCanvasInfo() {
  const paintedPixels = state.pixels.filter((pixel) => pixel !== null).length;
  const dimensions = `${state.width} × ${state.height}`;

  $("#paintedCount").textContent = paintedPixels;
  $("#infoDimensions").textContent = dimensions;
  $("#canvasInfo").textContent = `${dimensions} px`;
  $("#toolStatus").textContent = `${formatToolName(state.tool)} tool`;
  $("#infoTool").textContent = formatToolName(state.tool);
  $("#dimensionMeta").textContent = `${state.width * state.height} pixels`;
}

function drawCoordinates() {
  const top = $("#topCoords");
  const left = $("#leftCoords");
  const xTicks = getCoordinateTicks(state.width);
  const yTicks = getCoordinateTicks(state.height);

  top.replaceChildren(...xTicks.map(createCoordinate));
  left.replaceChildren(...yTicks.map(createCoordinate));
}

function getCoordinateTicks(size) {
  const tick = size <= 16 ? Math.floor : Math.round;
  return [0, tick(size / 4), tick(size / 2), tick((size * 3) / 4), size - 1];
}

function createCoordinate(value) {
  const element = document.createElement("span");
  element.textContent = value;
  return element;
}

//------- RESPONSIVE CANVAS AND THEME -------

export function observeCanvasSize() {
  new ResizeObserver(renderCanvas).observe(canvasWrap);
}

//------- THEME RESPONSE -------

document.addEventListener("pixelatelier:themechange", renderCanvas);
