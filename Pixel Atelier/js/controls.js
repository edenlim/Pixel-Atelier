import { state } from "./state.js";
import { renderCanvas, observeCanvasSize } from "./canvas.js";
import { undo, redo, configureHistory } from "./history.js";
import { refreshSizeControls } from "./resize.js";
import { $ } from "./utils.js";

//------- CANVAS CONTROL SETUP -------

export function setupCanvasControls() {
  $("#gridToggle").addEventListener("click", (event) => {
    state.grid = !state.grid;
    event.currentTarget.classList.toggle("on", state.grid);
    renderCanvas();
  });

  $("#undoBtn").addEventListener("click", undo);
  $("#redoBtn").addEventListener("click", redo);

  configureHistory(() => {
    refreshSizeControls();
    renderCanvas();
  });
  observeCanvasSize();
  renderCanvas();
}
