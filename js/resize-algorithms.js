//------- RESIZE PIXEL DATA -------

export function createResizedPixels(
  oldPixels,
  oldWidth,
  oldHeight,
  newWidth,
  newHeight,
  mode,
) {
  const newPixels = Array(newWidth * newHeight).fill(null);

  if (mode === "scale") {
    scaleArtwork(oldPixels, oldWidth, oldHeight, newPixels, newWidth, newHeight);
  } else {
    expandCanvas(oldPixels, oldWidth, oldHeight, newPixels, newWidth, newHeight);
  }

  return newPixels;
}

//------- ARTWORK SCALING -------

function scaleArtwork(
  oldPixels,
  oldWidth,
  oldHeight,
  newPixels,
  newWidth,
  newHeight,
) {
  if (newWidth >= oldWidth && newHeight >= oldHeight) {
    scaleArtworkUp(
      oldPixels,
      oldWidth,
      oldHeight,
      newPixels,
      newWidth,
      newHeight,
    );
    return;
  }

  for (let y = 0; y < newHeight; y += 1) {
    const sourceTop = (y * oldHeight) / newHeight;
    const sourceBottom = ((y + 1) * oldHeight) / newHeight;

    for (let x = 0; x < newWidth; x += 1) {
      newPixels[y * newWidth + x] = getMostCommonAreaColor(
        oldPixels,
        oldWidth,
        oldHeight,
        (x * oldWidth) / newWidth,
        ((x + 1) * oldWidth) / newWidth,
        sourceTop,
        sourceBottom,
      );
    }
  }
}

function scaleArtworkUp(
  oldPixels,
  oldWidth,
  oldHeight,
  newPixels,
  newWidth,
  newHeight,
) {
  for (let y = 0; y < newHeight; y += 1) {
    const sourceY = Math.min(
      oldHeight - 1,
      Math.floor(((y + 0.5) * oldHeight) / newHeight),
    );

    for (let x = 0; x < newWidth; x += 1) {
      const sourceX = Math.min(
        oldWidth - 1,
        Math.floor(((x + 0.5) * oldWidth) / newWidth),
      );
      newPixels[y * newWidth + x] = oldPixels[sourceY * oldWidth + sourceX];
    }
  }
}

function getMostCommonAreaColor(
  pixels,
  width,
  height,
  left,
  right,
  top,
  bottom,
) {
  const colors = new Map();
  const firstX = Math.floor(left);
  const lastX = Math.min(width, Math.ceil(right));
  const firstY = Math.floor(top);
  const lastY = Math.min(height, Math.ceil(bottom));

  for (let y = firstY; y < lastY; y += 1) {
    const overlapY = Math.min(bottom, y + 1) - Math.max(top, y);

    for (let x = firstX; x < lastX; x += 1) {
      const overlapX = Math.min(right, x + 1) - Math.max(left, x);
      const color = pixels[y * width + x];
      const area = overlapX * overlapY;
      colors.set(color, (colors.get(color) ?? 0) + area);
    }
  }

  let mostCommonColor = null;
  let largestArea = -1;
  for (const [color, area] of colors) {
    if (area > largestArea) {
      mostCommonColor = color;
      largestArea = area;
    }
  }

  return mostCommonColor;
}

function expandCanvas(
  oldPixels,
  oldWidth,
  oldHeight,
  newPixels,
  newWidth,
  newHeight,
) {
  const offsetX = Math.floor((newWidth - oldWidth) / 2);
  const offsetY = Math.floor((newHeight - oldHeight) / 2);

  for (let y = 0; y < oldHeight; y += 1) {
    for (let x = 0; x < oldWidth; x += 1) {
      const targetX = x + offsetX;
      const targetY = y + offsetY;
      if (
        targetX < 0 ||
        targetX >= newWidth ||
        targetY < 0 ||
        targetY >= newHeight
      ) {
        continue;
      }
      newPixels[targetY * newWidth + targetX] = oldPixels[y * oldWidth + x];
    }
  }
}

