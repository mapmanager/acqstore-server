// Scan path overlay geometry for reference channel viewports.
function scanPathPoints(scanPath, lineRoi) {
  if (
    scanPath &&
    Array.isArray(scanPath.x) &&
    Array.isArray(scanPath.y) &&
    scanPath.x.length > 0 &&
    scanPath.x.length === scanPath.y.length
  ) {
    return scanPath.x.map((x, index) => [x, scanPath.y[index]]);
  }
  if (Array.isArray(lineRoi) && lineRoi.length === 4) {
    return [[lineRoi[0], lineRoi[1]], [lineRoi[2], lineRoi[3]]];
  }
  return [];
}
function drawScanPathOverlay(ctx, scanPath, lineRoi, viewScale) {
  const points = scanPathPoints(scanPath, lineRoi);
  if (points.length === 0) return;
  // API (x=dim1, y=dim0) → display image coords after transpose: (y, x).
  const toImage = ([x, y]) => [y, x];
  const stroke = Math.max(1, 2 / viewScale);
  const radius = Math.max(1.5, 3 / viewScale);
  ctx.save();
  ctx.strokeStyle = '#fb7185';
  ctx.fillStyle = '#fb7185';
  ctx.lineWidth = stroke;
  ctx.beginPath();
  points.forEach((point, index) => {
    const [x, y] = toImage(point);
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
  for (const point of points) {
    const [x, y] = toImage(point);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.restore();
}

export {scanPathPoints, drawScanPathOverlay};
