import { undo, redo } from "./history.js";
import { clearSelection } from "./selection.js";
import { setTool } from "./tools.js";
import { $ } from "./utils.js";

//------- KEYBOARD SHORTCUTS -------

export function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (event) => {
    const tag = document.activeElement?.tagName;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;

    const modifierPressed = event.metaKey || event.ctrlKey;
    if (modifierPressed && event.key.toLowerCase() === "z") {
      event.preventDefault();
      event.shiftKey ? redo() : undo();
      return;
    }
    if (modifierPressed && event.key.toLowerCase() === "y") {
      event.preventDefault();
      redo();
      return;
    }
    if (modifierPressed && ["=", "+", "Add"].includes(event.key)) {
      event.preventDefault();
      $("#zoomIn").click();
      return;
    }
    if (modifierPressed && ["-", "_", "Subtract"].includes(event.key)) {
      event.preventDefault();
      $("#zoomOut").click();
      return;
    }
    if (modifierPressed && event.key === "0") {
      event.preventDefault();
      $("#fitBtn").click();
      return;
    }

    const shortcuts = {
      b: "pencil",
      g: "bucket",
      h: "move",
      i: "eyedropper",
      l: "lasso",
    };
    if (event.key.toLowerCase() === "e") {
      setTool(event.shiftKey ? "eraseFill" : "eraser");
      return;
    }
    const selectedTool = shortcuts[event.key.toLowerCase()];
    if (selectedTool) setTool(selectedTool);
    if (event.key === "Escape") clearSelection();
    if (event.key === "[") $("#zoomOut").click();
    if (event.key === "]") $("#zoomIn").click();
  });
}
