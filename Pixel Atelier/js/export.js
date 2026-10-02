import { state } from "./state.js";
import { $, showToast } from "./utils.js";

//------- EXPORT FILE NAMING -------

function makeFileName() {
  return (
    ($("#artName").value.trim() || "pixel-art")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "pixel-art"
  );
}

//------- SVG GENERATION -------

function createSVG() {
  const colorGroups = new Map();

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const color = state.pixels[y * state.width + x];
      if (!color) continue;

      if (!colorGroups.has(color)) colorGroups.set(color, []);
      colorGroups
        .get(color)
        .push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
    }
  }

  const groups = [...colorGroups]
    .map(
      ([color, rectangles]) =>
        `  <g fill="${color}">\n    ${rectangles.join("\n    ")}\n  </g>`,
    )
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${state.width}" height="${state.height}" viewBox="0 0 ${state.width} ${state.height}" shape-rendering="crispEdges">\n${groups}\n</svg>\n`;
}

//------- PNG GENERATION -------

function createPNG(callback) {
  const canvas = document.createElement("canvas");
  canvas.width = state.width;
  canvas.height = state.height;

  const context = canvas.getContext("2d");
  context.clearRect(0, 0, state.width, state.height);

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const color = state.pixels[y * state.width + x];
      if (!color) continue;
      context.fillStyle = color;
      context.fillRect(x, y, 1, 1);
    }
  }

  canvas.toBlob(callback, "image/png");
}

//------- FILE DOWNLOAD -------

function downloadFile(file, extension, message) {
  if (!file) {
    showToast("Could not create the image file.");
    return;
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${makeFileName()}.${extension}`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);

  showToast(message);
}

function exportArtwork(format) {
  if (format === "png") {
    createPNG((file) =>
      downloadFile(file, "png", "PNG exported with a transparent background."),
    );
    return;
  }

  const file = new Blob([createSVG()], { type: "image/svg+xml;charset=utf-8" });
  downloadFile(file, "svg", "SVG exported with a transparent background.");
}

export function setupExport() {
  const exportDialog = $("#exportDialog");
  let selectedFormat = "svg";

  $("#exportBtn").addEventListener("click", () => {
    const selectedOption = document.querySelector(
      `input[name="exportFormatChoice"][value="${selectedFormat}"]`,
    );
    if (selectedOption) selectedOption.checked = true;
    exportDialog.showModal();
  });

  $("#confirmExport").addEventListener("click", () => {
    const formatOption = document.querySelector(
      `input[name="exportFormatChoice"]:checked`,
    );
    selectedFormat = formatOption?.value ?? "svg";
    exportDialog.close();
    exportArtwork(selectedFormat);
  });
}
