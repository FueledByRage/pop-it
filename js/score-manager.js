function renderRankingList(list, players, isCurrentPlayer) {
  list.innerHTML = "";

  if (players.length === 0) {
    const li = document.createElement("li");
    li.classList.add("empty");
    li.textContent = "Nenhuma pontuação ainda";
    list.appendChild(li);
    return;
  }

  players.forEach((player, index) => {
    const li = document.createElement("li");
    if (isCurrentPlayer(player)) li.classList.add("highlight");

    const nameSpan = document.createElement("span");
    nameSpan.textContent = `#${index + 1} ${player.name}`;
    const scoreSpan = document.createElement("span");
    scoreSpan.textContent = player.score;

    li.appendChild(nameSpan);
    li.appendChild(scoreSpan);
    list.appendChild(li);
  });
}

async function saveScore(score) {
  if (!supabaseAvailable) {
    saveScoreLocally(currentPlayerName, score);
    return;
  }

  const playerId = localStorage.getItem("player_id");
  if (!playerId) {
    saveScoreLocally(currentPlayerName, score);
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("scores")
      .select("score")
      .eq("id", playerId)
      .single();

    if (error) {
      saveScoreLocally(currentPlayerName, score);
      return;
    }

    if (score > data.score) {
      await supabaseClient.from("scores").update({ score }).eq("id", playerId);
    }
  } catch (e) {
    console.warn("Erro ao salvar pontuação, salvando localmente:", e);
    saveScoreLocally(currentPlayerName, score);
  }
}

async function loadGameOverRanking() {
  const list = document.getElementById("gameOverRankingList");
  list.innerHTML = "<li class='empty'>Carregando...</li>";

  const currentPlayerId = localStorage.getItem("player_id");

  if (!supabaseAvailable) {
    const scores = getLocalScores(5);
    renderRankingList(list, scores, p => p.name === currentPlayerName);
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("scores")
      .select("id, player_name, score")
      .order("score", { ascending: false })
      .limit(5);

    if (error) throw error;

    renderRankingList(
      list,
      data.map(p => ({ name: p.player_name, score: p.score, id: p.id })),
      p => p.id == currentPlayerId
    );
  } catch (e) {
    console.warn("Erro ao carregar ranking online, usando local:", e);
    const scores = getLocalScores(5);
    renderRankingList(list, scores, p => p.name === currentPlayerName);
  }
}
