import { state } from "./state.js";
import { $, clamp, formatToolName } from "./utils.js";

const canvas = $("#pixelCanvas");
const context = canvas.getContext("2d");
const preview = $("#previewCanvas");
const previewContext = preview.getContext("2d");
const canvasWrap = $("#canvasWrap");
const artworkCanvas = document.createElement("canvas");
const artworkContext = artworkCanvas.getContext("2d");
const pixelColorCache = new Map();
let artworkImageData = null;
let renderedCoordinateDimensions = "";

function getPixelColor(color) {
  const cachedColor = pixelColorCache.get(color);
  if (cachedColor) return cachedColor;

  let channels;
  if (color.startsWith("#")) {
    let hex = color.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = [...hex].map((channel) => channel + channel).join("");
    }
    channels = [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
      hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) : 255,
    ];
  } else {
    const values = color
      .match(/^rgba?\(([^)]+)\)$/i)?.[1]
      .split(/[\s,/]+/)
      .filter(Boolean);
    if (!values || values.length < 3) return [0, 0, 0, 255];
    channels = [
      Number(values[0]),
      Number(values[1]),
      Number(values[2]),
      values[3] === undefined ? 255 : Math.round(Number(values[3]) * 255),
    ];
  }

  if (pixelColorCache.size < 8192) pixelColorCache.set(color, channels);
  return channels;
}

function renderArtworkPixels() {
  if (
    artworkCanvas.width !== state.width ||
    artworkCanvas.height !== state.height
  ) {
    artworkCanvas.width = state.width;
    artworkCanvas.height = state.height;
    artworkImageData = artworkContext.createImageData(state.width, state.height);
  }

  const data = artworkImageData.data;
  let paintedPixels = 0;
  for (let index = 0; index < state.pixels.length; index += 1) {
    const color = state.pixels[index];
    const offset = index * 4;
    if (!color) {
      data[offset] = 0;
      data[offset + 1] = 0;
      data[offset + 2] = 0;
      data[offset + 3] = 0;
      continue;
    }

    const [red, green, blue, alpha] = getPixelColor(color);
    data[offset] = red;
    data[offset + 1] = green;
    data[offset + 2] = blue;
    data[offset + 3] = alpha;
    paintedPixels += 1;
  }

  artworkContext.putImageData(artworkImageData, 0, 0);
  return paintedPixels;
}

export function createArtworkPNG(callback, crop = null) {
  renderArtworkPixels();
  if (!crop) {
    artworkCanvas.toBlob(callback, "image/png");
    return;
  }

  createCroppedArtworkCanvas(crop).toBlob(callback, "image/png");
}

export function getArtworkPNGDataURL(crop = null) {
  const paintedPixels = renderArtworkPixels();
  if (paintedPixels <= 50000) return null;
  if (!crop) return artworkCanvas.toDataURL("image/png");

  return createCroppedArtworkCanvas(crop).toDataURL("image/png");
}

function createCroppedArtworkCanvas(crop) {
  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = crop.width;
  croppedCanvas.height = crop.height;
  const croppedContext = croppedCanvas.getContext("2d");
  croppedContext.drawImage(
    artworkCanvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );
  return croppedCanvas;
}

//------- CANVAS RENDERING -------

export function renderCanvas() {
  const rect = canvasWrap.getBoundingClientRect();
  const pixelRatio = window.devicePixelRatio || 1;
  const paintedPixels = renderArtworkPixels();
  const maxPanX = (rect.width * (state.zoom - 1)) / 2;
  const maxPanY = (rect.height * (state.zoom - 1)) / 2;
  state.panX = clamp(state.panX, -maxPanX, maxPanX);
  state.panY = clamp(state.panY, -maxPanY, maxPanY);

  const backingWidth = Math.max(1, Math.round(rect.width * pixelRatio));
  const backingHeight = Math.max(1, Math.round(rect.height * pixelRatio));
  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth;
    canvas.height = backingHeight;
  }
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);
  context.imageSmoothingEnabled = false;

  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  context.save();
  context.translate(centerX + state.panX, centerY + state.panY);
  context.scale(state.zoom, state.zoom);
  context.translate(-centerX, -centerY);
  context.drawImage(artworkCanvas, 0, 0, rect.width, rect.height);

  const cellWidth = rect.width / state.width;
  const cellHeight = rect.height / state.height;

  if (
    state.grid &&
    cellWidth * state.zoom >= 4 &&
    cellHeight * state.zoom >= 4
  ) {
    drawGrid(rect.width, rect.height, cellWidth, cellHeight);
  }

  drawSelectionOutline(cellWidth, cellHeight);
  context.restore();

  renderPreview();
  updateCanvasInfo(paintedPixels);
  drawCoordinates();
}

function drawSelectionOutline(cellWidth, cellHeight) {
  const points = state.selection?.points;
  if (!points?.length) return;

  context.save();
  context.beginPath();
  points.forEach((point, index) => {
    const x = point.x * cellWidth;
    const y = point.y * cellHeight;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
  context.lineWidth = 1.5;
  context.setLineDash([3, 2]);
  context.lineDashOffset = 0;
  context.strokeStyle =
    document.documentElement.dataset.theme === "dark" ? "#ffffff" : "#292b26";
  context.shadowColor =
    document.documentElement.dataset.theme === "dark" ? "#292b26" : "#ffffff";
  context.shadowBlur = 2;
  context.stroke();
  context.restore();
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

  const backingSize = size * pixelRatio;
  if (preview.width !== backingSize || preview.height !== backingSize) {
    preview.width = backingSize;
    preview.height = backingSize;
  }
  previewContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  previewContext.clearRect(0, 0, size, size);
  previewContext.imageSmoothingEnabled = false;
  previewContext.drawImage(artworkCanvas, 0, 0, size, size);
}

//------- CANVAS LABELS AND COORDINATES -------

function updateCanvasInfo(paintedPixels) {
  const dimensions = `${state.width} × ${state.height}`;

  $("#paintedCount").textContent = paintedPixels;
  $("#infoDimensions").textContent = dimensions;
  $("#canvasInfo").textContent = `${dimensions} px`;
  $("#toolStatus").textContent = `${formatToolName(state.tool)} tool`;
  $("#infoTool").textContent = formatToolName(state.tool);
  $("#dimensionMeta").textContent = `${state.width * state.height} pixels`;
}

function drawCoordinates() {
  const dimensions = [
    state.width,
    state.height,
    state.zoom,
    state.panX,
    state.panY,
    canvasWrap.clientWidth,
    canvasWrap.clientHeight,
  ].join(":");
  if (dimensions === renderedCoordinateDimensions) return;

  const top = $("#topCoords");
  const left = $("#leftCoords");
  const xTicks = getVisibleCoordinateTicks(
    state.width,
    canvasWrap.clientWidth,
    state.panX,
  );
  const yTicks = getVisibleCoordinateTicks(
    state.height,
    canvasWrap.clientHeight,
    state.panY,
  );

  top.replaceChildren(...xTicks.map(createCoordinate));
  left.replaceChildren(...yTicks.map(createCoordinate));
  renderedCoordinateDimensions = dimensions;
}

function getVisibleCoordinateTicks(size, viewportSize, panOffset) {
  const fractions = [0, 0.25, 0.5, 0.75, 1];
  const cellSize = viewportSize / size;
  const viewportCenter = viewportSize / 2;

  return fractions.map((fraction) => {
    const screenPosition = fraction * viewportSize;
    const artworkPosition =
      (screenPosition - viewportCenter - panOffset) / state.zoom +
      viewportCenter;
    const pixel = Math.floor(artworkPosition / cellSize + 1e-8);
    return pixel < 0 || pixel >= size ? "·" : pixel;
  });
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
