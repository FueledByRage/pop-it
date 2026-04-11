const shapes = [];
let lastSpawn = 0;

function getDifficulty() {
  const elapsed = (performance.now() - startTime) / 1000;
  return Math.min(elapsed / TIME_TO_MAX, 1);
}

function spawnShape() {
  if (shapes.length >= MAX_SHAPES) return;

  const viewportMin = Math.min(canvas.width, canvas.height) / (window.devicePixelRatio || 1);
  const baseSize = viewportMin * 0.05;
  const randomVariation = viewportMin * 0.03;
  const angle = Math.random() * Math.PI * 2;
  const minRadius = viewportMin * 0.55;
  const maxRadius = viewportMin * 0.70;
  const radius = minRadius + Math.random() * (maxRadius - minRadius);
  const difficulty = getDifficulty();

  shapes.push({
    id: crypto.randomUUID(),
    type: SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)],
    x: CENTER.x() + Math.cos(angle) * radius,
    y: CENTER.y() + Math.sin(angle) * radius,
    size: baseSize + Math.random() * randomVariation,
    strokeColor: STROKE_COLORS[Math.floor(Math.random() * STROKE_COLORS.length)],
    speed: (MIN_SPEED + (MAX_SPEED - MIN_SPEED) * difficulty) * (viewportMin / 500),
  });
}

function handleSpawn(delta) {
  lastSpawn += delta;
  const spawnInterval = 2000 - 1300 * getDifficulty();

  if (lastSpawn >= spawnInterval) {
    spawnShape();
    lastSpawn = 0;
  }
}

function moveShape(shape) {
  const dx = CENTER.x() - shape.x;
  const dy = CENTER.y() - shape.y;
  const dist = Math.hypot(dx, dy) || 1;
  shape.x += (dx / dist) * shape.speed;
  shape.y += (dy / dist) * shape.speed;
}

function drawShape(shape) {
  ctx.save();
  ctx.translate(shape.x, shape.y);
  ctx.strokeStyle = shape.strokeColor;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();

  if (shape.type === 'circle') ctx.arc(0, 0, shape.size, 0, Math.PI * 2);
  if (shape.type === 'line') { ctx.moveTo(0, -shape.size); ctx.lineTo(0, shape.size); }
  if (shape.type === 'v') {
    ctx.moveTo(-shape.size, -shape.size / 2);
    ctx.lineTo(0, shape.size);
    ctx.lineTo(shape.size, -shape.size / 2);
  }

  ctx.stroke();
  ctx.restore();
}
