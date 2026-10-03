import { MAX_CANVAS_DIMENSION, state } from "./state.js";
import { recordChange } from "./history.js";
import { renderCanvas } from "./canvas.js";
import { $, showToast } from "./utils.js";

//------- IMAGE IMPORT -------

function isSupportedImage(file) {
  return (
    file.type === "image/png" ||
    file.type === "image/svg+xml" ||
    /\.(png|svg)$/i.test(file.name)
  );
}

function loadImage(file) {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  image.src = objectUrl;
  return image
    .decode()
    .then(() => image)
    .finally(() => URL.revokeObjectURL(objectUrl));
}

async function getImageDimensions(file, image) {
  if (!/\.svg$/i.test(file.name) && file.type !== "image/svg+xml") {
    return { width: image.naturalWidth, height: image.naturalHeight };
  }

  try {
    const document = new DOMParser().parseFromString(
      await file.text(),
      "image/svg+xml",
    );
    const svg = document.documentElement;
    const viewBox = svg
      .getAttribute("viewBox")
      ?.trim()
      .split(/[\s,]+/)
      .map(Number);
    const viewBoxWidth = viewBox?.length === 4 ? viewBox[2] : 0;
    const viewBoxHeight = viewBox?.length === 4 ? viewBox[3] : 0;
    const width = parseSvgLength(svg.getAttribute("width")) || viewBoxWidth;
    const height = parseSvgLength(svg.getAttribute("height")) || viewBoxHeight;

    if (width > 0 && height > 0) return { width, height };
  } catch {
    // Fall back to the browser's decoded image dimensions.
  }

  return { width: image.naturalWidth, height: image.naturalHeight };
}

function parseSvgLength(value) {
  if (!value) return 0;
  const match = value.trim().match(/^([\d.]+)(?:px)?$/i);
  return match ? Number(match[1]) : 0;
}

function fitImageToCanvas(image, sourceWidth, sourceHeight) {
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    throw new Error("The image has no readable dimensions.");
  }

  const scale = Math.min(
    1,
    MAX_CANVAS_DIMENSION / sourceWidth,
    MAX_CANVAS_DIMENSION / sourceHeight,
  );
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const importCanvas = document.createElement("canvas");
  importCanvas.width = width;
  importCanvas.height = height;

  const importContext = importCanvas.getContext("2d", {
    willReadFrequently: true,
  });
  importContext.clearRect(0, 0, width, height);
  importContext.imageSmoothingEnabled = false;
  importContext.drawImage(image, 0, 0, width, height);

  const { data } = importContext.getImageData(
    0,
    0,
    width,
    height,
  );
  const pixels = Array(width * height).fill(null);

  for (let index = 0; index < pixels.length; index += 1) {
    const offset = index * 4;
    const alpha = data[offset + 3];
    if (alpha === 0) continue;

    const red = data[offset].toString(16).padStart(2, "0");
    const green = data[offset + 1].toString(16).padStart(2, "0");
    const blue = data[offset + 2].toString(16).padStart(2, "0");
    pixels[index] =
      alpha === 255
        ? `#${red}${green}${blue}`
        : `rgba(${data[offset]}, ${data[offset + 1]}, ${data[offset + 2]}, ${alpha / 255})`;
  }

  return { width, height, pixels, wasScaled: scale < 1 };
}

export function setupImageImport() {
  const fileInput = $("#importFile");

  $("#importBtn").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    fileInput.value = "";
    if (!file) return;

    if (!isSupportedImage(file)) {
      showToast("Choose a PNG or SVG image to import.");
      return;
    }

    try {
      const image = await loadImage(file);
      const dimensions = await getImageDimensions(file, image);
      const importedImage = fitImageToCanvas(
        image,
        dimensions.width,
        dimensions.height,
      );

      recordChange();
      state.width = importedImage.width;
      state.height = importedImage.height;
      state.pixels = importedImage.pixels;
      state.selection = null;
      renderCanvas();
      showToast(
        importedImage.wasScaled
          ? `Canvas set to ${importedImage.width} × ${importedImage.height}; image scaled to the ${MAX_CANVAS_DIMENSION} px limit.`
          : `Canvas set to ${importedImage.width} × ${importedImage.height}.`,
      );
    } catch {
      showToast("Could not import this image. Try another PNG or SVG.");
    }
  });
}
