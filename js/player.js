const playerImage = new Image();
playerImage.src = "./public/player.png";
let playerReady = false;
playerImage.onload = () => { playerReady = true; };

let playerHitRadius = 80;

const player = {
  state: "idle",
  frame: 0,
  frameWidth: 1390 / 4,
  frameHeight: 461,
};

function drawPlayer() {
  if (!playerReady) return;

  const cx = CENTER.x();
  const cy = CENTER.y();
  const sx = player.frame * player.frameWidth;
  const targetHeight = canvas.height / (window.devicePixelRatio || 1) * 0.4;
  const scale = targetHeight / player.frameHeight;
  const drawW = player.frameWidth * scale;
  const drawH = player.frameHeight * scale;

  playerHitRadius = drawH * 0.25;

  ctx.drawImage(
    playerImage,
    sx, 0, player.frameWidth, player.frameHeight,
    cx - drawW / 2, cy - drawH / 2, drawW, drawH
  );
}

function checkPlayerCollision(shape) {
  const dx = shape.x - CENTER.x();
  const dy = shape.y - CENTER.y();
  const dist = Math.hypot(dx, dy);
  return dist < (playerHitRadius + shape.size * 0.8);
}

function triggerRandomAction() {
  if (player.state === "dead") return;

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