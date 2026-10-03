//------- BUILT-IN COLOR PALETTE -------

export const palette = [
  "#ee7863",
  "#d9a16f",
  "#e9c86d",
  "#93a77e",
  "#668a79",
  "#79a9a7",
  "#7b91b5",
  "#9a83ad",
  "#c47c8a",
  "#795c52",
  "#5d6661",
  "#353a37",
  "#ffffff",
  "#d6d2c7",
  "#aaa99f",
  "#72756f",
  "#454842",
  "#242722",
];

export const MAX_CANVAS_DIMENSION = 2048;

//------- SHARED EDITOR STATE -------

export const state = {
  width: 16,
  height: 16,
  pixels: Array(16 * 16).fill(null),
  color: palette[0],
  tool: "pencil",
  brushSize: 1,
  grid: true,
  zoom: 1,
  drawing: false,
  lastCell: null,
  selection: null,
};
