function saveScoreLocally(playerName, score) {
  if (!playerName) return;
  let scores = [];
  try {
    scores = JSON.parse(localStorage.getItem("offline_scores") || "[]");
  } catch (e) {
    scores = [];
  }

  const existing = scores.find(s => s.name === playerName);
  if (existing) {
    if (score > existing.score) existing.score = score;
  } else {
    scores.push({ name: playerName, score });
  }

  scores.sort((a, b) => b.score - a.score);
  localStorage.setItem("offline_scores", JSON.stringify(scores.slice(0, 20)));
}

function getLocalScores(limit = 5) {
  try {
    return JSON.parse(localStorage.getItem("offline_scores") || "[]").slice(0, limit);
  } catch (e) {
    return [];
  }
}
