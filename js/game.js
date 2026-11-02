(() => {
  const ROWS = 6, COLS = 5;
  const $ = (s) => document.querySelector(s);
  const VALID = new Set([...ANSWERS, ...GUESSES]);
  const LS = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

  const settings = Object.assign({ hard: false, light: false, contrast: false, haptics: true }, LS.get("wordle.settings", {}));
  const stats = Object.assign({ played: 0, won: 0, streak: 0, best: 0, dist: [0, 0, 0, 0, 0, 0] }, LS.get("wordle.stats", {}));
  let used = LS.get("wordle.used", []);
  let g; // current game: {answer, guesses, current, status}
  let busy = false;

  const saveGame = () => LS.set("wordle.game", g);
  const vibrate = (n) => { if (settings.haptics && navigator.vibrate) navigator.vibrate(n); };

  function applyTheme() {
    document.body.classList.toggle("light", settings.light);
    document.body.classList.toggle("contrast", settings.contrast);
    $('meta[name="theme-color"]').content = settings.light ? "#f5f6fa" : "#0f1117";
  }

  function pickAnswer() {
    let pool = ANSWERS.filter((w) => !used.includes(w));
    if (!pool.length) { used = []; pool = ANSWERS; }
    const w = pool[Math.floor(Math.random() * pool.length)];
    used.push(w); LS.set("wordle.used", used);
    return w;
  }

  function newGame() {
    g = { answer: pickAnswer(), guesses: [], current: "", status: "playing" };
    saveGame(); buildBoard(); resetKeys(); busy = false;
  }

  function evaluate(guess, answer) {
    const res = Array(COLS).fill("absent"), left = {};
    for (let i = 0; i < COLS; i++) {
      if (guess[i] === answer[i]) res[i] = "correct";
      else left[answer[i]] = (left[answer[i]] || 0) + 1;
    }
    for (let i = 0; i < COLS; i++) {
      if (res[i] !== "correct" && left[guess[i]] > 0) { res[i] = "present"; left[guess[i]]--; }
    }
    return res;
  }

  function buildBoard() {
    const b = $("#board"); b.innerHTML = "";
    for (let r = 0; r < ROWS; r++) {
      const row = document.createElement("div"); row.className = "row";
      for (let c = 0; c < COLS; c++) { const t = document.createElement("div"); t.className = "tile"; row.appendChild(t); }
      b.appendChild(row);
    }
    g.guesses.forEach((w, r) => paintRow(r, w, evaluate(w, g.answer), false));
    renderCurrent();
    updateKeys();
  }

  const rowEl = (r) => $("#board").children[r];

  function paintRow(r, word, res, animate) {
    [...rowEl(r).children].forEach((t, i) => {
      t.textContent = word[i];
      t.classList.add("filled");
      if (animate) {
        t.style.animationDelay = i * 300 + "ms"; t.classList.add("flip");
        setTimeout(() => t.classList.add(res[i]), i * 300 + 250);
      } else t.classList.add(res[i]);
    });
  }

  function renderCurrent() {
    if (g.status !== "playing") return;
    const r = g.guesses.length;
    [...rowEl(r).children].forEach((t, i) => {
      const ch = g.current[i] || "";
      t.textContent = ch;
      t.classList.toggle("filled", !!ch);
    });
  }

  function buildKeys() {
    const kb = $("#keyboard");
    ["qwertyuiop", "asdfghjkl", "+zxcvbnm-"].forEach((rw) => {
      const row = document.createElement("div"); row.className = "krow";
      [...rw].forEach((k) => {
        const b = document.createElement("button");
        b.className = "key"; b.dataset.key = k === "+" ? "enter" : k === "-" ? "back" : k;
        if (k === "+") { b.textContent = "Enter"; b.classList.add("wide"); }
        else if (k === "-") { b.innerHTML = "&#9003;"; b.classList.add("wide"); b.setAttribute("aria-label", "Backspace"); }
        else b.textContent = k;
        row.appendChild(b);
      });
      kb.appendChild(row);
    });
    kb.addEventListener("pointerdown", (e) => {
      const b = e.target.closest(".key"); if (!b) return;
      e.preventDefault(); press(b.dataset.key);
    });
  }

  function resetKeys() { document.querySelectorAll(".key").forEach((k) => k.classList.remove("correct", "present", "absent")); }
  function updateKeys() {
    resetKeys();
    const rank = { absent: 1, present: 2, correct: 3 }, best = {};
    g.guesses.forEach((w) => evaluate(w, g.answer).forEach((s, i) => { if (!best[w[i]] || rank[s] > rank[best[w[i]]]) best[w[i]] = s; }));
    for (const [l, s] of Object.entries(best)) document.querySelector(`.key[data-key="${l}"]`)?.classList.add(s);
  }

  function toast(msg) {
    const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
    $("#toast-area").prepend(t); setTimeout(() => t.remove(), 2000);
  }

  const ord = (n) => ["1st", "2nd", "3rd", "4th", "5th"][n - 1];
  function hardViolation(word) {
    const prev = g.guesses[g.guesses.length - 1]; if (!prev) return null;
    const res = evaluate(prev, g.answer);
    for (let i = 0; i < COLS; i++) if (res[i] === "correct" && word[i] !== prev[i]) return `${ord(i + 1)} letter must be ${prev[i].toUpperCase()}`;
    const need = {};
    res.forEach((s, i) => { if (s !== "absent") need[prev[i]] = (need[prev[i]] || 0) + 1; });
    for (const [l, n] of Object.entries(need)) if ([...word].filter((c) => c === l).length < n) return `Guess must contain ${l.toUpperCase()}`;
    return null;
  }

  function reject(msg) {
    toast(msg); vibrate(80);
    const row = rowEl(g.guesses.length); row.classList.remove("shake"); void row.offsetWidth; row.classList.add("shake");
  }

  function press(k) {
    if (busy || g.status !== "playing") return;
    if (k === "enter") return submit();
    if (k === "back") { g.current = g.current.slice(0, -1); }
    else if (/^[a-z]$/.test(k) && g.current.length < COLS) { g.current += k; vibrate(5); }
    else return;
    saveGame(); renderCurrent();
  }

  function submit() {
    const w = g.current;
    if (w.length < COLS) return reject("Not enough letters");
    if (!VALID.has(w)) return reject("Not in word list");
    if (settings.hard) { const v = hardViolation(w); if (v) return reject(v); }
    const r = g.guesses.length, res = evaluate(w, g.answer);
    g.guesses.push(w); g.current = "";
    const won = w === g.answer, lost = !won && g.guesses.length === ROWS;
    if (won || lost) g.status = won ? "won" : "lost";
    saveGame();
    busy = true;
    paintRow(r, w, res, true);
    setTimeout(() => {
      updateKeys();
      if (won) {
        [...rowEl(r).children].forEach((t, i) => { t.style.animationDelay = i * 100 + "ms"; t.classList.remove("flip"); t.classList.add("bounce"); });
        toast(["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!"][r]);
        vibrate([30, 40, 30]);
      } else if (lost) toast(g.answer.toUpperCase());
      busy = false;
      if (won || lost) { recordResult(won, r + 1); setTimeout(showResult, won ? 1500 : 1200); }
    }, COLS * 300 + 300);
  }

  function recordResult(won, n) {
    stats.played++;
    if (won) { stats.won++; stats.streak++; stats.best = Math.max(stats.best, stats.streak); stats.dist[n - 1]++; }
    else stats.streak = 0;
    LS.set("wordle.stats", stats);
  }

  const modal = $("#modal"), body = $("#modal-body");
  function open(html) { body.innerHTML = html; modal.classList.remove("hidden"); }
  function close() { modal.classList.add("hidden"); }
  modal.addEventListener("pointerdown", (e) => { if (e.target === modal) close(); });
  $("#modal-close").addEventListener("click", close);

  const exTile = (l, s) => `<div class="tile filled ${s || ""}">${l}</div>`;
  const exRow = (w, s) => `<div class="ex">${[...w].map((l, i) => exTile(l.toUpperCase(), s[i])).join("")}</div>`;

  function showHelp() {
    open(`<h2>How to play</h2>
      <p>Guess the hidden word in 6 tries. Each guess must be a valid 5-letter word. After each guess, tile colors show how close you were.</p>
      ${exRow("crane", ["correct", "", "", "", ""])}<p><b>C</b> is in the word and in the correct spot.</p>
      ${exRow("pilot", ["", "present", "", "", ""])}<p><b>I</b> is in the word but in the wrong spot.</p>
      ${exRow("vague", ["", "", "", "absent", ""])}<p><b>U</b> is not in the word.</p>
      <p>Play as many games as you like — a new word is picked every time.</p>
      <button class="btn" id="ok">Got it</button>`);
    $("#ok").onclick = close;
  }

  function statsHtml() {
    const max = Math.max(1, ...stats.dist);
    const last = g.status === "won" ? g.guesses.length : -1;
    return `<div class="stats">
        <div><b>${stats.played}</b><span>Played</span></div>
        <div><b>${stats.played ? Math.round((stats.won / stats.played) * 100) : 0}</b><span>Win %</span></div>
        <div><b>${stats.streak}</b><span>Streak</span></div>
        <div><b>${stats.best}</b><span>Best</span></div></div>
      <h3>Guess distribution</h3>
      ${stats.dist.map((n, i) => `<div class="bar-row">${i + 1}<div class="bar ${last === i + 1 ? "hl" : ""}" style="width:${Math.max(8, (n / max) * 88)}%">${n}</div></div>`).join("")}`;
  }

  function shareText() {
    const em = { correct: "🟩", present: "🟨", absent: "⬛" };
    const grid = g.guesses.map((w) => evaluate(w, g.answer).map((s) => em[s]).join("")).join("\n");
    return `Wordle ${g.status === "won" ? g.guesses.length : "X"}/6${settings.hard ? "*" : ""}\n\n${grid}`;
  }

  async function share() {
    const text = shareText();
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); toast("Copied to clipboard"); }
    } catch (e) { if (e.name !== "AbortError") toast("Couldn't share"); }
  }

  function showStats() {
    const over = g.status !== "playing";
    open(`<h2>${over ? (g.status === "won" ? "You won!" : "Better luck next time") : "Statistics"}</h2>
      ${over ? `<div class="result"><div>The word was</div><div class="word">${g.answer}</div></div>` : ""}
      ${statsHtml()}
      ${over ? `<button class="btn" id="again">Play again</button><button class="btn alt" id="share">Share result</button>` : `<button class="btn alt" id="ok">Close</button>`}`);
    if (over) { $("#again").onclick = () => { close(); newGame(); }; $("#share").onclick = share; }
    else $("#ok").onclick = close;
  }
  const showResult = showStats;

  function opt(id, title, sub, on) {
    return `<div class="opt"><div>${title}<small>${sub}</small></div><button class="sw ${on ? "on" : ""}" id="${id}" role="switch" aria-checked="${on}" aria-label="${title}"></button></div>`;
  }

  function showSettings() {
    open(`<h2>Settings</h2>
      ${opt("s-hard", "Hard mode", "Revealed hints must be used in later guesses", settings.hard)}
      ${opt("s-light", "Light theme", "Switch from dark to light", settings.light)}
      ${opt("s-contrast", "High contrast", "Orange and blue instead of green and yellow", settings.contrast)}
      ${opt("s-haptics", "Vibration", "Haptic feedback on supported phones", settings.haptics)}
      <button class="btn alt" id="s-new">New game</button>
      <button class="btn alt" id="s-reset">Reset statistics</button>`);
    const bind = (id, key, guard) => $(id).onclick = (e) => {
      if (guard && !guard()) return;
      settings[key] = !settings[key]; LS.set("wordle.settings", settings); applyTheme();
      e.currentTarget.classList.toggle("on", settings[key]);
      e.currentTarget.setAttribute("aria-checked", settings[key]);
    };
    bind("#s-hard", "hard", () => { if (g.status === "playing" && g.guesses.length > 0) { toast("Hard mode can only change before your first guess"); return false; } return true; });
    bind("#s-light", "light"); bind("#s-contrast", "contrast"); bind("#s-haptics", "haptics");
    $("#s-new").onclick = () => { close(); newGame(); };
    $("#s-reset").onclick = () => {
      if (!confirm("Reset all statistics?")) return;
      Object.assign(stats, { played: 0, won: 0, streak: 0, best: 0, dist: [0, 0, 0, 0, 0, 0] });
      LS.set("wordle.stats", stats); toast("Statistics reset");
    };
  }

  $("#btn-help").onclick = showHelp;
  $("#btn-stats").onclick = showStats;
  $("#btn-settings").onclick = showSettings;

  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || !modal.classList.contains("hidden")) return;
    if (e.key === "Enter") press("enter");
    else if (e.key === "Backspace") press("back");
    else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toLowerCase());
  });
  // Block double-tap zoom on iOS
  document.addEventListener("dblclick", (e) => e.preventDefault());

  applyTheme();
  buildKeys();
  const saved = LS.get("wordle.game", null);
  if (saved && saved.answer && saved.status === "playing") { g = saved; buildBoard(); }
  else if (saved && saved.answer && saved.status !== "playing") { g = saved; buildBoard(); setTimeout(showResult, 300); }
  else { newGame(); showHelp(); }
})();
