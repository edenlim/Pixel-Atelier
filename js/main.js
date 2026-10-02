import { setupCanvasControls } from "./controls.js";
import { setupColors } from "./colors.js";
import { setupExport } from "./export.js";
import { setupKeyboardShortcuts } from "./keyboard.js";
import { setupResizeControls } from "./resize.js";
import { setupThemeToggle } from "./theme.js";
import { setupTools } from "./tools.js";
import { setupZoomControls } from "./zoom.js";
import { $ } from "./utils.js";

//------- APP INITIALIZATION -------

async function initializePixelAtelier() {
  await loadDialogMarkup();

  setupThemeToggle();
  setupColors();
  setupCanvasControls();
  setupZoomControls();
  setupTools();
  setupResizeControls();
  setupExport();
  setupKeyboardShortcuts();

  $("#changelogBtn").addEventListener("click", () => {
    $("#changelogDialog").showModal();
  });
}

async function loadDialogMarkup() {
  const dialogsUrl = new URL("../partials/dialogs.html", import.meta.url);
  const response = await fetch(dialogsUrl);
  if (!response.ok) {
    throw new Error(`Could not load dialog markup (${response.status}).`);
  }
  $("#dialogContainer").innerHTML = await response.text();
}

initializePixelAtelier().catch((error) => {
  console.error("Pixel Atelier could not finish loading.", error);
});
