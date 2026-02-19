const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const sfxPop = new Audio('./public/pop.mp3');
const sfxDefeat = new Audio('./public/defeat.wav');
const bgMusic = new Audio('./public/level.wav');

let gameOverTriggered = false;

bgMusic.loop = true;
bgMusic.volume = 0.4;

const playerImage = new Image();
playerImage.src = "./public/player.png";
const PLAYER_HIT_RADIUS = 80;

const heartImage = new Image();
heartImage.src = "./public/heart.png";
let heartReady = false;
heartImage.onload = () => heartReady = true;

const HEART_SIZE = 30; // Tamanho do ícone
const HEART_PADDING = 10; // Espaço entre os corações

let screenShake = 0;
let flashOpacity = 0;
let playerReady = false;

playerImage.onload = () => {
  playerReady = true;
};

const player = {
  state: "idle",
  frame: 0,
  frameWidth: 1390 / 4,
  frameHeight: 461,
};

const PLAYER_FRAMES = {
  idle: 0,
  action1: 1, // Antigo 'down'
  action2: 2, // Antigo 'up'
  dead: 3,
};

const STROKE_COLORS = ['#ff3b3b', '#ffd93b', '#3b82ff'];
let strokeColor = STROKE_COLORS[0];

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

  shapes.push({
    id: crypto.randomUUID(),
    type: SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)],
    x: CENTER.x() + Math.cos(angle) * radius,
    y: CENTER.y() + Math.sin(angle) * radius,
    size: 30 + Math.random() * 20,
    speed: MIN_SPEED + (MAX_SPEED - MIN_SPEED) * getDifficulty(),
  });
}

let lastSpawn = 0;
function handleSpawn(delta) {
  lastSpawn += delta;
  const spawnInterval = 2000 - 1300 * getDifficulty();
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

function moveShape(shape) {
  const dx = CENTER.x() - shape.x;
  const dy = CENTER.y() - shape.y;
  const dist = Math.hypot(dx, dy) || 1;
  shape.x += (dx / dist) * shape.speed;
  shape.y += (dy / dist) * shape.speed;
}

let isDrawing = false;
let stroke = [];

canvas.addEventListener('pointerdown', e => {
  if (bgMusic.paused && lives > 0) {
    bgMusic.play().catch(err => console.log("Aguardando interação para áudio"));
  }
  isDrawing = true;
  stroke = [];
  strokeColor = STROKE_COLORS[Math.floor(Math.random() * STROKE_COLORS.length)];
  addPoint(e);
});

canvas.addEventListener('pointermove', e => { if (isDrawing) addPoint(e); });
canvas.addEventListener('pointerup', finishStroke);

function addPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  const last = stroke[stroke.length - 1];
  if (!last || Math.hypot(point.x - last.x, point.y - last.y) > 4) stroke.push(point);
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

      sfxPop.currentTime = 0; // Reinicia o som caso ele já esteja tocando
      sfxPop.play();
    }
  }
  stroke = [];
}

function triggerRandomAction() {
  if (player.state === "dead") return;
  
  // Escolhe aleatoriamente entre frame 1 (down) ou 2 (up)
  const randomAction = Math.random() > 0.5 ? "action1" : "action2";
  player.state = randomAction;
  player.frame = PLAYER_FRAMES[randomAction];

  setTimeout(() => {
    if (player.state !== "dead") {
      player.state = "idle";
      player.frame = PLAYER_FRAMES.idle;
    }
  }, 150);
}

function drawFlash() {
  if (flashOpacity <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(255, 0, 0, ${flashOpacity})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  flashOpacity -= 0.05; // Diminui o flash gradualmente
}

function loop(now) {
  const delta = now - (window.lastTime || now);
  window.lastTime = now;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Aplica Tremida (Shake) no contexto
  ctx.save();
  if (screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * screenShake;
    const shakeY = (Math.random() - 0.5) * screenShake;
    ctx.translate(shakeX, shakeY);
    screenShake *= 0.9; // Diminui a tremedeira
    if (screenShake < 0.5) screenShake = 0;
  }

  handleSpawn(delta);

  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i];
    moveShape(shape);

    if (checkPlayerCollision(shape) && lives > 0) {
      shapes.splice(i, 1);
      lives--;
      // Ativa os feedbacks visuais
      screenShake = 15;
      flashOpacity = 0.4;
      continue;
    }
    drawShape(shape);
  }
  
  if (lives <= 0 && !gameOverTriggered) {
    player.state = "dead";
    player.frame = PLAYER_FRAMES.dead;

    player.state = "dead";
    player.frame = PLAYER_FRAMES.dead;
    
    bgMusic.pause();
    sfxDefeat.play();
    
    gameOverTriggered = true;
  }

  drawStroke();
  drawPlayer();
  ctx.restore(); // Fim da área afetada pelo Shake

  drawFlash(); // Flash desenhado por cima de tudo
  updateHUD();
  requestAnimationFrame(loop);
}

// Funções Auxiliares de Classificação (Mantidas as originais)
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
  if (isCircle(points)) return 'circle';
  if (isLine(points)) return 'line';
  if (isV(points)) return 'v';
  return null;
}

function isLine(points) {
  const start = points[0], end = points[points.length - 1];
  const totalDist = Math.hypot(end.x - start.x, end.y - start.y);
  let pathDist = 0;
  for (let i = 1; i < points.length; i++) pathDist += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return pathDist / totalDist < 1.15;
}

function isV(points) {
  let turns = 0;
  for (let i = 2; i < points.length - 2; i++) {
    const p0 = points[i - 2], p1 = points[i], p2 = points[i + 2];
    const v1 = { x: p1.x - p0.x, y: p1.y - p0.y }, v2 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
    if (mag > 0 && Math.acos(dot / mag) > Math.PI / 3) turns++;
  }
  return turns >= 1 && turns < 5;
}

function isCircle(points) {
  const center = { x: points.reduce((s, p) => s + p.x, 0) / points.length, y: points.reduce((s, p) => s + p.y, 0) / points.length };
  const dists = points.map(p => Math.hypot(p.x - center.x, p.y - center.y));
  const avg = dists.reduce((a, b) => a + b, 0) / dists.length;
  const variance = dists.reduce((s, d) => s + Math.abs(d - avg), 0) / dists.length;
  return variance < 0.12;
}

function drawPlayer() {
  if (!playerReady) return;
  const cx = CENTER.x(), cy = CENTER.y();
  const sx = player.frame * player.frameWidth;
  const targetHeight = canvas.height / (window.devicePixelRatio || 1) * 0.4;
  
  const scale = targetHeight / player.frameHeight;
  const drawW = player.frameWidth * scale, drawH = player.frameHeight * scale;

  ctx.drawImage(playerImage, sx, 0, player.frameWidth, player.frameHeight, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
}

function checkPlayerCollision(shape) {
  return Math.hypot(shape.x - CENTER.x(), shape.y - CENTER.y()) < PLAYER_HIT_RADIUS;
}

function updateHUD() {
  drawHearts();
  document.getElementById('score').textContent = `Score: ${score}`;
  //document.getElementById('lives').textContent = `Lives: ${lives}`;
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

function drawHearts() {
  if (!heartReady) return;

  const canvasW = canvas.width / (window.devicePixelRatio || 1);
  
  for (let i = 0; i < lives; i++) {
    const x = canvasW - HEART_PADDING - (i + 1) * (HEART_SIZE + HEART_PADDING);
    const y = HEART_PADDING;

    ctx.drawImage(heartImage, x, y, HEART_SIZE, HEART_SIZE);
  }
}

requestAnimationFrame(loop);