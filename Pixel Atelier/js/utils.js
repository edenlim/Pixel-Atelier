let toastTimer;

//------- DOM AND NUMBER HELPERS -------

export function $(selector) {
  return document.querySelector(selector);
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

//------- UI FEEDBACK -------

export function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

export function formatToolName(tool) {
  return tool[0].toUpperCase() + tool.slice(1);
}
