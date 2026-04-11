let isDrawing = false;
let stroke = [];
let strokeColor = STROKE_COLORS[0];

canvas.addEventListener('pointerdown', e => {
  if (bgMusic.paused && lives > 0) {
    bgMusic.play().catch(err => console.log("Aguardando interação para áudio"));
  }
  isDrawing = true;
  stroke = [];
  strokeColor = STROKE_COLORS[Math.floor(Math.random() * STROKE_COLORS.length)];
  addPoint(e);
});

canvas.addEventListener('pointermove', e => {
  if (isDrawing) addPoint(e);
});

canvas.addEventListener('pointerup', finishStroke);

function addPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  const last = stroke[stroke.length - 1];
  if (!last || Math.hypot(point.x - last.x, point.y - last.y) > 4) {
    stroke.push(point);
  }
}

function finishStroke() {
  triggerRandomAction();
  if (!isDrawing) return;
  isDrawing = false;

  const type = classifyStroke(stroke);

  if (type) {
    const index = shapes.findIndex(s => s.type === type);
    if (index !== -1) {
      shapes.splice(index, 1);
      score += 10;
      sfxPop.currentTime = 0;
      sfxPop.play();
    }
  }

  stroke = [];
}

function drawStroke() {
  if (stroke.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(stroke[0].x, stroke[0].y);
  for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 4;
  ctx.stroke();
}

// --- Algoritmos de Classificação ---

function normalizePoints(points) {
  const minX = Math.min(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxX = Math.max(...points.map(p => p.x));
  const maxY = Math.max(...points.map(p => p.y));
  const scale = Math.max(maxX - minX, maxY - minY) || 1;
  return points.map(p => ({ x: (p.x - minX) / scale, y: (p.y - minY) / scale }));
}

function classifyStroke(rawPoints) {
  if (rawPoints.length < 8) return null;
  const points = normalizePoints(rawPoints);
  if (isV(rawPoints)) return 'v';
  if (isCircle(points)) return 'circle';
  if (isLine(points)) return 'line';
  return null;
}

function isLine(points) {
  const start = points[0];
  const end = points[points.length - 1];
  const totalDist = Math.hypot(end.x - start.x, end.y - start.y);
  let pathDist = 0;
  for (let i = 1; i < points.length; i++) {
    pathDist += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return pathDist / totalDist < 1.15;
}

function isV(points) {
  if (points.length < 5) return false;

  const ys = points.map(p => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const height = maxY - minY;

  if (height < 20) return false;

  const p1 = points[0];
  const p2 = points[Math.floor(points.length / 2)];
  const p3 = points[points.length - 1];

  const midIsLowerThanStart = p2.y > p1.y + (height * 0.2);
  const midIsLowerThanEnd = p2.y > p3.y + (height * 0.2);
  const distStartEnd = Math.hypot(p3.x - p1.x, p3.y - p1.y);
  const isNotCircle = distStartEnd > height * 0.3;

  return midIsLowerThanStart && midIsLowerThanEnd && isNotCircle;
}

function isCircle(points) {
  const center = {
    x: points.reduce((s, p) => s + p.x, 0) / points.length,
    y: points.reduce((s, p) => s + p.y, 0) / points.length,
  };
  const dists = points.map(p => Math.hypot(p.x - center.x, p.y - center.y));
  const avg = dists.reduce((a, b) => a + b, 0) / dists.length;
  const variance = dists.reduce((s, d) => s + Math.abs(d - avg), 0) / dists.length;
  return variance < 0.12;
}
