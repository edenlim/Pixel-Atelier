import { setupCanvasControls } from "./controls.js";
import { setupColors } from "./colors.js";
import { setupExport } from "./export.js";
import { setupKeyboardShortcuts } from "./keyboard.js";
import { setupResizeControls } from "./resize.js";
import { setupThemeToggle } from "./theme.js";
import { setupTools } from "./tools.js";
import { setupZoomControls } from "./zoom.js";

//------- APP INITIALIZATION -------

function initializePixelAtelier() {
  setupThemeToggle();
  setupColors();
  setupCanvasControls();
  setupZoomControls();
  setupTools();
  setupResizeControls();
  setupExport();
  setupKeyboardShortcuts();
}

initializePixelAtelier();
