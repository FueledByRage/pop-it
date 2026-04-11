const heartImage = new Image();
heartImage.src = "./public/heart.png";
let heartReady = false;
heartImage.onload = () => { heartReady = true; };

let screenShake = 0;
let flashOpacity = 0;

function drawHearts() {
  if (!heartReady) return;
  const canvasW = canvas.width / (window.devicePixelRatio || 1);

  for (let i = 0; i < lives; i++) {
    const x = canvasW - HEART_PADDING - (i + 1) * (HEART_SIZE + HEART_PADDING);
    const y = HEART_PADDING;
    ctx.drawImage(heartImage, x, y, HEART_SIZE, HEART_SIZE);
  }
}

function drawFlash() {
  if (flashOpacity <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(255, 0, 0, ${flashOpacity})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  flashOpacity -= 0.05;
}

function updateHUD() {
  drawHearts();
  document.getElementById('score').textContent = `Score: ${score}`;
}

function showMessage(text, type) {
  const message = document.getElementById("playerMessage");
  message.textContent = text;
  message.className = `message ${type}`;
}

document.getElementById('start-button').addEventListener('click', handleStartGame);

document.getElementById('restart-button').addEventListener('click', () => {
  lives = 5;
  score = 0;
  startTime = performance.now();
  lastSpawn = 0;
  shapes.length = 0;
  gameOverTriggered = false;

  player.state = "idle";
  player.frame = PLAYER_FRAMES.idle;

  document.getElementById('game-over-screen').style.display = 'none';
  bgMusic.currentTime = 0;
  bgMusic.play();
});

async function handleStartGame() {
  // Modo offline
  if (!supabaseAvailable) {
    const savedName = localStorage.getItem("offline_player_name");
    if (savedName) {
      currentPlayerName = savedName;
      startGame();
      return;
    }

    const playerName = document.getElementById("player-name-input").value.trim();
    if (!playerName) {
      showMessage("Digite um nome válido", "error");
      return;
    }

    currentPlayerName = playerName;
    localStorage.setItem("offline_player_name", playerName);
    startGame();
    return;
  }

  // Modo online
  const existingId = localStorage.getItem("player_id");

  if (existingId) {
    try {
      const { data, error } = await supabaseClient
        .from("scores")
        .select("id, player_name")
        .eq("id", existingId)
        .single();

      if (!error && data) {
        currentPlayerName = data.player_name;
        localStorage.setItem("offline_player_name", data.player_name);
        startGame();
        return;
      }
    } catch (e) {
      console.warn("Erro ao verificar jogador existente:", e);
    }
    localStorage.removeItem("player_id");
  }

  const playerName = document.getElementById("player-name-input").value.trim();
  if (!playerName) {
    showMessage("Digite um nome válido", "error");
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("scores")
      .insert([{ player_name: playerName, score: 0 }])
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        showMessage("Esse nome já está em uso 😢", "error");
        return;
      }
      // Fallback para offline em outros erros de Supabase
      currentPlayerName = playerName;
      localStorage.setItem("offline_player_name", playerName);
      startGame();
      return;
    }

    localStorage.setItem("player_id", data.id);
    localStorage.setItem("offline_player_name", data.player_name);
    currentPlayerName = data.player_name;
    startGame();
  } catch (e) {
    console.warn("Erro ao criar jogador, usando modo offline:", e);
    currentPlayerName = playerName;
    localStorage.setItem("offline_player_name", playerName);
    startGame();
  }
}

function startGame() {
  document.getElementById('start-screen').style.display = 'none';
  gameStarted = true;
  startTime = performance.now();

  if (bgMusic.paused) {
    bgMusic.play().catch(() => console.log("Áudio aguardando interação"));
  }
}

async function checkExistingPlayer() {
  // Modo offline: usa nome salvo localmente
  if (!supabaseAvailable) {
    const savedName = localStorage.getItem("offline_player_name");
    if (savedName) {
      currentPlayerName = savedName;
      showMessage(`Olá, ${savedName} 👋`, "success");
      const input = document.getElementById("player-name-input");
      if (input) input.value = savedName;
    } else {
      showMessage("Modo offline — pontuação salva localmente", "error");
    }
    return;
  }

  // Modo online
  const playerId = localStorage.getItem("player_id");
  if (!playerId) return;

  try {
    const { data, error } = await supabaseClient
      .from("scores")
      .select("player_name, score")
      .eq("id", playerId)
      .single();

    if (error || !data) {
      localStorage.removeItem("player_id");
      return;
    }

    currentPlayerName = data.player_name;
    localStorage.setItem("offline_player_name", data.player_name);
    showMessage(`Olá, ${data.player_name} 👋`, "success");
    const input = document.getElementById("player-name-input");
    if (input) input.value = data.player_name;
  } catch (e) {
    console.warn("Erro ao verificar jogador:", e);
    localStorage.removeItem("player_id");

    // Usa nome em cache se disponível
    const savedName = localStorage.getItem("offline_player_name");
    if (savedName) {
      currentPlayerName = savedName;
      showMessage(`Olá, ${savedName} 👋`, "success");
      const input = document.getElementById("player-name-input");
      if (input) input.value = savedName;
    }
  }
}
