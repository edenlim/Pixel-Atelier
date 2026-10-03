import { undo, redo } from "./history.js";
import { clearSelection, setTool } from "./tools.js";
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

    const shortcuts = {
      b: "pencil",
      e: "eraser",
      g: "bucket",
      i: "eyedropper",
      l: "lasso",
    };
    const selectedTool = shortcuts[event.key.toLowerCase()];
    if (selectedTool) setTool(selectedTool);
    if (event.key === "Escape") clearSelection();
    if (event.key === "[") $("#zoomOut").click();
    if (event.key === "]") $("#zoomIn").click();
  });
}
