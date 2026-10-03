import { state } from "./state.js";
import { renderCanvas } from "./canvas.js";
import { $, clamp } from "./utils.js";

//------- ZOOM LEVEL -------

export function setZoomLevel(zoom) {
  state.zoom = clamp(zoom, 1, 4);
  $("#zoomLabel").value = Math.round(state.zoom * 100);
  renderCanvas();
}

//------- ZOOM BUTTONS -------

export function setupZoomControls() {
  const zoomInput = $("#zoomLabel");

  $("#zoomIn").addEventListener("click", () => {
    setZoomLevel(state.zoom + 0.1);
  });
  $("#zoomOut").addEventListener("click", () => {
    setZoomLevel(state.zoom - 0.1);
  });
  $("#fitBtn").addEventListener("click", () => {
    state.panX = 0;
    state.panY = 0;
    setZoomLevel(1);
  });

  zoomInput.addEventListener("change", () => {
    if (!zoomInput.value.trim()) {
      setZoomLevel(state.zoom);
      return;
    }
    const percentage = Number(zoomInput.value);
    if (!Number.isFinite(percentage)) {
      setZoomLevel(state.zoom);
      return;
    }
    setZoomLevel(percentage / 100);
  });

  zoomInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      zoomInput.blur();
    } else if (event.key === "Escape") {
      zoomInput.value = Math.round(state.zoom * 100);
      zoomInput.blur();
    }
  });

  $("#canvasStage").addEventListener(
    "wheel",
    (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoomLevel(state.zoom * Math.exp(-event.deltaY * 0.002));
    },
    { passive: false },
  );
}
