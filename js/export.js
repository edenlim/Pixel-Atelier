import { state } from "./state.js";
import { createArtworkPNG, getArtworkPNGDataURL } from "./canvas.js";
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

//------- EXPORT CROP BOUNDS -------

function getExportBounds(trimTransparentEdges) {
  if (!trimTransparentEdges) {
    return { x: 0, y: 0, width: state.width, height: state.height };
  }

  let left = state.width;
  let top = state.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      if (!state.pixels[y * state.width + x]) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) {
    return { x: 0, y: 0, width: state.width, height: state.height };
  }

  return {
    x: left,
    y: top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

//------- SVG GENERATION -------

function createSVG(bounds) {
  const isFullCanvas =
    bounds.x === 0 &&
    bounds.y === 0 &&
    bounds.width === state.width &&
    bounds.height === state.height;
  const artworkPNG = getArtworkPNGDataURL(isFullCanvas ? null : bounds);
  if (artworkPNG) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="0 0 ${bounds.width} ${bounds.height}"><image width="${bounds.width}" height="${bounds.height}" href="${artworkPNG}"/></svg>\n`;
  }

  const colorGroups = new Map();

  for (let y = bounds.y; y < bounds.y + bounds.height; y += 1) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x += 1) {
      const color = state.pixels[y * state.width + x];
      if (!color) continue;

      if (!colorGroups.has(color)) colorGroups.set(color, []);
      colorGroups
        .get(color)
        .push(
          `<rect x="${x - bounds.x}" y="${y - bounds.y}" width="1" height="1"/>`,
        );
    }
  }

  const groups = [...colorGroups]
    .map(
      ([color, rectangles]) =>
        `  <g fill="${color}">\n    ${rectangles.join("\n    ")}\n  </g>`,
    )
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="0 0 ${bounds.width} ${bounds.height}" shape-rendering="crispEdges">\n${groups}\n</svg>\n`;
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

function exportArtwork(format, trimTransparentEdges) {
  const bounds = getExportBounds(trimTransparentEdges);

  if (format === "png") {
    createArtworkPNG(
      (file) =>
        downloadFile(file, "png", "PNG exported with a transparent background."),
      trimTransparentEdges ? bounds : null,
    );
    return;
  }

  const file = new Blob([createSVG(bounds)], {
    type: "image/svg+xml;charset=utf-8",
  });
  downloadFile(file, "svg", "SVG exported with a transparent background.");
}

export function setupExport() {
  const exportDialog = $("#exportDialog");
  const exportHint = $("#exportHint");
  const trimCheckbox = $("#trimTransparentEdges");
  const formatOptions = document.querySelectorAll(
    'input[name="exportFormatChoice"]',
  );
  let selectedFormat = "svg";

  function updateExportHint(format) {
    if (trimCheckbox.checked) {
      exportHint.textContent =
        format === "png"
          ? "PNG is cropped to the artwork bounds; remaining empty pixels stay transparent."
          : "SVG dimensions are cropped to the artwork bounds; empty pixels inside stay transparent.";
      return;
    }

    exportHint.textContent =
      format === "png"
        ? "PNG downloads at your canvas size and keeps empty pixels transparent."
        : "SVG preserves transparency; dense artwork is embedded as an image to keep files manageable.";
  }

  formatOptions.forEach((option) => {
    option.addEventListener("change", () => {
      updateExportHint(option.value);
    });
  });
  trimCheckbox.addEventListener("change", () => {
    const selectedOption = document.querySelector(
      'input[name="exportFormatChoice"]:checked',
    );
    updateExportHint(selectedOption?.value ?? "svg");
  });

  $("#exportBtn").addEventListener("click", () => {
    const selectedOption = document.querySelector(
      `input[name="exportFormatChoice"][value="${selectedFormat}"]`,
    );
    if (selectedOption) selectedOption.checked = true;
    updateExportHint(selectedFormat);
    exportDialog.showModal();
  });

  $("#confirmExport").addEventListener("click", () => {
    const formatOption = document.querySelector(
      `input[name="exportFormatChoice"]:checked`,
    );
    selectedFormat = formatOption?.value ?? "svg";
    const trimTransparentEdges = trimCheckbox.checked;
    exportDialog.close();
    exportArtwork(selectedFormat, trimTransparentEdges);
  });
}
