import { state } from "./state.js";
import { $, clamp } from "./utils.js";

//------- ZOOM LEVEL -------

export function setZoomLevel(zoom) {
  state.zoom = clamp(zoom, 0.4, 4);
  $("#zoomLabel").textContent = `${Math.round(state.zoom * 100)}%`;
  $("#canvasWrap").style.transform =
    state.zoom === 1 ? "" : `scale(${state.zoom})`;
}

//------- ZOOM BUTTONS -------

export function setupZoomControls() {
  $("#zoomIn").addEventListener("click", () => {
    setZoomLevel(state.zoom + 0.1);
  });
  $("#zoomOut").addEventListener("click", () => {
    setZoomLevel(state.zoom - 0.1);
  });
  $("#fitBtn").addEventListener("click", () => setZoomLevel(1));
}
