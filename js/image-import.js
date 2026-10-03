import { state } from "./state.js";
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

function fitImageToCanvas(image) {
  const importCanvas = document.createElement("canvas");
  importCanvas.width = state.width;
  importCanvas.height = state.height;

  const importContext = importCanvas.getContext("2d", {
    willReadFrequently: true,
  });
  const scale = Math.min(
    state.width / image.naturalWidth,
    state.height / image.naturalHeight,
  );
  const imageWidth = image.naturalWidth * scale;
  const imageHeight = image.naturalHeight * scale;
  const offsetX = (state.width - imageWidth) / 2;
  const offsetY = (state.height - imageHeight) / 2;

  importContext.clearRect(0, 0, state.width, state.height);
  importContext.imageSmoothingEnabled = false;
  importContext.drawImage(image, offsetX, offsetY, imageWidth, imageHeight);

  const { data } = importContext.getImageData(
    0,
    0,
    state.width,
    state.height,
  );
  const pixels = Array(state.width * state.height).fill(null);

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

  return pixels;
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
      const importedPixels = fitImageToCanvas(image);

      recordChange();
      state.pixels = importedPixels;
      state.selection = null;
      renderCanvas();
      showToast("Image fitted to the canvas.");
    } catch {
      showToast("Could not import this image. Try another PNG or SVG.");
    }
  });
}
