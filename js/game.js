let gameStarted = false;
let gameOverTriggered = false;
let currentPlayerName = "Anônimo";

let lives = 5;
let score = 0;
let startTime = performance.now();

function loop(now) {
  // Antes do jogo iniciar: exibe só o player parado
  if (!gameStarted) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayer();
    requestAnimationFrame(loop);
    return;
  }

  const delta = now - (window.lastTime || now);
  window.lastTime = now;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

  ctx.save();

  // Screen shake
  if (screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * screenShake;
    const shakeY = (Math.random() - 0.5) * screenShake;
    ctx.translate(shakeX, shakeY);
    screenShake *= 0.9;
    if (screenShake < 0.5) screenShake = 0;
  }

  // Lógica principal (só roda se ainda houver vidas)
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
  }

  // Game over
  if (lives <= 0 && !gameOverTriggered) {
    saveScore(score);

    player.state = "dead";
    player.frame = PLAYER_FRAMES.dead;

    bgMusic.pause();
    sfxDefeat.play();

    gameOverTriggered = true;

    setTimeout(() => {
      document.getElementById('final-score-text').textContent = `Você fez ${score} pontos!`;
      document.getElementById('game-over-screen').style.display = 'flex';
      loadGameOverRanking();
    }, 1000);
  }

  drawStroke();
  drawPlayer();
  ctx.restore(); // Fim do screen shake

  drawFlash();
  drawHearts();
  updateHUD();

  requestAnimationFrame(loop);
}

checkExistingPlayer();
requestAnimationFrame(loop);