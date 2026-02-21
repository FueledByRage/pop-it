const supabaseUrl = "process.env.SUPABASE_URL";
const supabaseKey = "process.env.SUPABASE_KEY";

const supabaseClient = supabase.createClient(
    supabaseUrl,
    supabaseKey
);

let loading = false;

async function loadRanking() {
    if (loading) return;
    loading = true;

    const list = document.getElementById("rankingList");
    list.innerHTML = '<li class="empty">Carregando...</li>';

    const { data, error } = await supabaseClient
        .from("scores")
        .select("player_name, score")
        .order("score", { ascending: false })
        .limit(10);

    loading = false;

    if (error) {
        list.innerHTML = '<li class="empty">Erro ao carregar ranking</li>';
        console.error(error);
        return;
    }

    if (!data || data.length === 0) {
        list.innerHTML = '<li class="empty">Nenhum score ainda</li>';
        return;
    }

    list.innerHTML = "";

    data.forEach((item, index) => {
        const li = document.createElement("li");
        li.className = "ranking-item";

        li.innerHTML = `
        <span class="pos">#${index + 1}</span>
        <span class="name">${item.player_name}</span>
        <span class="score">${item.score}</span>
      `;

        list.appendChild(li);
    });
}

function goBack() {
    window.location.href = "index.html";
}

loadRanking();

setInterval(() => {
    loadRanking();
}, 5000);