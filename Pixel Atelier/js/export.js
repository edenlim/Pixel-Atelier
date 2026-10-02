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

//------- DOWNLOAD -------

function downloadSVG() {
  const file = new Blob([createSVG()], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${makeFileName()}.svg`;
  link.click();
  URL.revokeObjectURL(url);

  showToast("SVG exported with a transparent background.");
}

export function setupExport() {
  $("#exportBtn").addEventListener("click", downloadSVG);
}
