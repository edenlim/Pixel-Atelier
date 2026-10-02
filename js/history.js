import { state } from "./state.js";
import { $ } from "./utils.js";

const undoStack = [];
const redoStack = [];
let onRestore = () => {};
let redoStackBeforeLastChange = [];

//------- HISTORY CONFIGURATION -------

export function configureHistory(restoreCallback) {
  onRestore = restoreCallback;
}

//------- SNAPSHOT MANAGEMENT -------

function createSnapshot() {
  return {
    width: state.width,
    height: state.height,
    pixels: state.pixels.slice(),
  };
}

function restoreSnapshot(snapshot) {
  state.width = snapshot.width;
  state.height = snapshot.height;
  state.pixels = snapshot.pixels.slice();
  onRestore();
}

//------- UNDO AND REDO -------

export function recordChange() {
  undoStack.push(createSnapshot());
  if (undoStack.length > 80) undoStack.shift();
  redoStackBeforeLastChange = redoStack.slice();
  redoStack.length = 0;
  updateHistoryButtons();
}

export function cancelLastChange() {
  const previousState = undoStack.pop();
  if (!previousState) return;

  redoStack.splice(0, redoStack.length, ...redoStackBeforeLastChange);
  restoreSnapshot(previousState);
  updateHistoryButtons();
}

export function undo() {
  if (!undoStack.length) return;

  redoStack.push(createSnapshot());
  restoreSnapshot(undoStack.pop());
  updateHistoryButtons();
}

export function redo() {
  if (!redoStack.length) return;

  undoStack.push(createSnapshot());
  restoreSnapshot(redoStack.pop());
  updateHistoryButtons();
}

//------- HISTORY BUTTON STATE -------

function updateHistoryButtons() {
  $("#undoBtn").disabled = undoStack.length === 0;
  $("#redoBtn").disabled = redoStack.length === 0;
}
