const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function fitScreen() {
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  resize();
}

fitScreen();
window.addEventListener('resize', fitScreen);

const CENTER = {
  x: () => canvas.width / (window.devicePixelRatio || 1) / 2,
  y: () => canvas.height / (window.devicePixelRatio || 1) / 2,
};

const MAX_SHAPES = 6;
const shapes = [];

let lives = 8;
let score = 0;
let startTime = performance.now();

const TIME_TO_MAX = 120;
const MIN_SPEED = 0.4;
const MAX_SPEED = 2.2;

function getDifficulty() {
  const elapsed = (performance.now() - startTime) / 1000;
  return Math.min(elapsed / TIME_TO_MAX, 1);
}

const SHAPE_TYPES = ['circle', 'line', 'v'];

function spawnShape() {
  if (shapes.length >= MAX_SHAPES) return;

  const angle = Math.random() * Math.PI * 2;

  const minRadius = Math.min(canvas.width, canvas.height) * 0.35;
  const maxRadius = Math.min(canvas.width, canvas.height) * 0.45;

  const radius = minRadius + Math.random() * (maxRadius - minRadius);

  const x = CENTER.x() + Math.cos(angle) * radius;
  const y = CENTER.y() + Math.sin(angle) * radius;

  const difficulty = getDifficulty();

  shapes.push({
    id: crypto.randomUUID(),
    type: SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)],
    x,
    y,
    size: 30 + Math.random() * 20,
    speed: MIN_SPEED + (MAX_SPEED - MIN_SPEED) * difficulty,
  });
}

let lastSpawn = 0;

function handleSpawn(delta) {
  lastSpawn += delta;
  const difficulty = getDifficulty();
  const spawnInterval = 2000 - 1300 * difficulty;

  if (lastSpawn >= spawnInterval) {
    spawnShape();
    lastSpawn = 0;
  }
}

function drawShape(shape) {
  ctx.save();
  ctx.translate(shape.x, shape.y);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';

  ctx.beginPath();

  if (shape.type === 'circle') {
    ctx.arc(0, 0, shape.size, 0, Math.PI * 2);
  }

  if (shape.type === 'line') {
    ctx.moveTo(-shape.size, 0);
    ctx.lineTo(shape.size, 0);
  }

  if (shape.type === 'v') {
    ctx.moveTo(-shape.size, -shape.size / 2);
    ctx.lineTo(0, shape.size);
    ctx.lineTo(shape.size, -shape.size / 2);
  }

  ctx.stroke();
  ctx.restore();
}


function moveShape(shape) {
  const dx = CENTER.x() - shape.x;
  const dy = CENTER.y() - shape.y;
  const dist = Math.hypot(dx, dy) || 1;

  if (dist < 10) {
    return true;
  }

  shape.x += (dx / dist) * shape.speed;
  shape.y += (dy / dist) * shape.speed;

  return false;
}


let isDrawing = false;
let stroke = [];
const MIN_DIST = 4;

canvas.addEventListener('pointerdown', e => {
  isDrawing = true;
  stroke = [];
  addPoint(e);
});

canvas.addEventListener('pointermove', e => {
  if (!isDrawing) return;
  addPoint(e);
});

canvas.addEventListener('pointerup', finishStroke);
canvas.addEventListener('pointercancel', finishStroke);

function addPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const point = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };

  const last = stroke[stroke.length - 1];
  if (!last || Math.hypot(point.x - last.x, point.y - last.y) > MIN_DIST) {
    stroke.push(point);
  }
}

function finishStroke() {
  if (!isDrawing) return;
  isDrawing = false;

  const type = classifyStroke(stroke);

  if (type) {
    const index = shapes.findIndex(s => s.type === type);
    if (index !== -1) {
      shapes.splice(index, 1);
      score += 10;
    }
  }

  stroke = [];
}


function drawStroke() {
  if (stroke.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(stroke[0].x, stroke[0].y);

  for (let i = 1; i < stroke.length; i++) {
    ctx.lineTo(stroke[i].x, stroke[i].y);
  }

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}
function updateHUD() {
  document.getElementById('score').textContent = `Score: ${score}`;
  
  const time = Math.floor((performance.now() - startTime) / 1000);
  document.getElementById('time').textContent = `Time: ${time}s`;

  document.getElementById('lives').textContent = `Lives: ${lives}`;
}

let lastTime = performance.now();

function loop(now) {
  const delta = now - lastTime;
  lastTime = now;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  handleSpawn(delta);

  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i];

    const reachedCenter = moveShape(shape);

    if (reachedCenter) {
      shapes.splice(i, 1);
      lives--;
      continue;
    }

    drawShape(shape);
  }


  drawStroke();
  updateHUD();

  requestAnimationFrame(loop);
}

loop(lastTime);


function normalizePoints(points) {
  const minX = Math.min(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxX = Math.max(...points.map(p => p.x));
  const maxY = Math.max(...points.map(p => p.y));

  const width = maxX - minX;
  const height = maxY - minY;
  const scale = Math.max(width, height) || 1;

  return points.map(p => ({
    x: (p.x - minX) / scale,
    y: (p.y - minY) / scale,
  }));
}

function getCenter(points) {
  return {
    x: points.reduce((s, p) => s + p.x, 0) / points.length,
    y: points.reduce((s, p) => s + p.y, 0) / points.length,
  };
}

function isLine(points) {
  const start = points[0];
  const end = points[points.length - 1];

  const totalDist = Math.hypot(end.x - start.x, end.y - start.y);

  let pathDist = 0;
  for (let i = 1; i < points.length; i++) {
    pathDist += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y
    );
  }

  return pathDist / totalDist < 1.15;
}

function isV(points) {
  let sharpTurnIndex = -1;
  let sharpTurns = 0;

  for (let i = 2; i < points.length - 2; i++) {
    const p0 = points[i - 2];
    const p1 = points[i];
    const p2 = points[i + 2];

    const v1x = p1.x - p0.x;
    const v1y = p1.y - p0.y;
    const v2x = p2.x - p1.x;
    const v2y = p2.y - p1.y;

    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.hypot(v1x, v1y);
    const mag2 = Math.hypot(v2x, v2y);

    if (mag1 === 0 || mag2 === 0) continue;

    const angle = Math.acos(dot / (mag1 * mag2));

    if (angle > Math.PI / 3) {
      sharpTurns++;
      sharpTurnIndex = i;
    }
  }

  return sharpTurns === 1;
}

function isCircle(points) {
  const center = getCenter(points);

  const distances = points.map(p =>
    Math.hypot(p.x - center.x, p.y - center.y)
  );

  const avg = distances.reduce((a, b) => a + b, 0) / distances.length;

  const variance =
    distances.reduce((s, d) => s + Math.abs(d - avg), 0) /
    distances.length;

  return variance < 0.12;
}

function classifyStroke(rawPoints) {
  if (rawPoints.length < 8) return null;

  const points = normalizePoints(rawPoints);

  if (isCircle(points)) return 'circle';
  if (isLine(points)) return 'line';
  if (isV(points)) return 'v';

  return null;
}
