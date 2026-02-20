const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let gameStarted = false;

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

let playerHitRadius = 80;

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

document.getElementById('start-button').addEventListener('click', () => {
  document.getElementById('start-screen').style.display = 'none';
  gameStarted = true;
  startTime = performance.now();
  
  if (bgMusic.paused) {
    bgMusic.play().catch(e => console.log("Áudio aguardando interação"));
  }
});

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

  const viewportMin = Math.min(canvas.width, canvas.height) / (window.devicePixelRatio || 1);
  
  const baseSize = viewportMin * 0.05; 
  const randomVariation = viewportMin * 0.03;

  const angle = Math.random() * Math.PI * 2;
  const minRadius = viewportMin * 0.35;
  const maxRadius = viewportMin * 0.45;
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
  ctx.strokeStyle = shape.strokeColor;
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
  if (!gameStarted) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayer();
    requestAnimationFrame(loop);
    return;
  }

  const delta = now - (window.lastTime || now);
  window.lastTime = now;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 3. Início do Shake (Tudo dentro daqui treme)
  ctx.save();
  if (screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * screenShake;
    const shakeY = (Math.random() - 0.5) * screenShake;
    ctx.translate(shakeX, shakeY);
    screenShake *= 0.9; 
    if (screenShake < 0.5) screenShake = 0;
  }

  if (lives > 0) {
    handleSpawn(delta);

    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      moveShape(shape);

      if (checkPlayerCollision(shape)) {
        shapes.splice(i, 1);
        lives--;
        screenShake = 15;
        flashOpacity = 0.4;
        continue;
      }
      drawShape(shape);
    }
  } else if (!gameOverTriggered) {
    player.state = "dead";
    player.frame = PLAYER_FRAMES.dead;
    bgMusic.pause();
    sfxDefeat.play();
    gameOverTriggered = true;
  }

  drawStroke();
  drawPlayer();
  ctx.restore(); // Fim do Shake

  drawFlash();
  drawHearts();
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
  if (isV(rawPoints)) return 'v';
  if (isCircle(points)) return 'circle';
  if (isLine(points)) return 'line';
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
  if (points.length < 5) return false;

  const ys = points.map(p => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const height = maxY - minY;

  if (height < 20) return false; 

  const segmentSize = Math.floor(points.length / 3);
  const p1 = points[0]; // Início
  const p2 = points[Math.floor(points.length / 2)]; // Meio (Aproximado)
  const p3 = points[points.length - 1]; // Fim

  const midIsLowerThanStart = p2.y > p1.y + (height * 0.2);
  const midIsLowerThanEnd = p2.y > p3.y + (height * 0.2);

  const distStartEnd = Math.hypot(p3.x - p1.x, p3.y - p1.y);
  const isNotCircle = distStartEnd > height * 0.3;

  return midIsLowerThanStart && midIsLowerThanEnd && isNotCircle;
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

  playerHitRadius = drawH * 0.25;

  ctx.drawImage(playerImage, sx, 0, player.frameWidth, player.frameHeight, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
}

function checkPlayerCollision(shape) {
  const dx = shape.x - CENTER.x();
  const dy = shape.y - CENTER.y();
  const dist = Math.hypot(dx, dy);

  return dist < (playerHitRadius + shape.size * 0.8);
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