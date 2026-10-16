(() => {
  "use strict";

  const canvas = document.querySelector("#game-canvas");
  const ctx = canvas.getContext("2d");
  const ui = {
    score: document.querySelector("#score"),
    distance: document.querySelector("#distance"),
    lives: document.querySelector("#lives"),
    screen: document.querySelector("#screen-card"),
    emoji: document.querySelector("#screen-emoji"),
    eyebrow: document.querySelector("#screen-eyebrow"),
    title: document.querySelector("#screen-title"),
    copy: document.querySelector("#screen-copy"),
    record: document.querySelector("#record"),
    play: document.querySelector("#play-button"),
    pause: document.querySelector("#pause-button"),
    pauseCard: document.querySelector("#pause-card"),
    resume: document.querySelector("#resume-button"),
    home: document.querySelector("#home-button"),
    jump: document.querySelector("#jump-button"),
    tip: document.querySelector("#game-tip"),
    sound: document.querySelector("#sound-button"),
    fullscreen: document.querySelector("#fullscreen-button"),
    fullscreenHint: document.querySelector("#fullscreen-hint"),
  };

  const SAVE_KEY = "drageflugt-save-v1";
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const GROUND = 420;
  const MILESTONE_LENGTH = 1000;
  const SPEED = 190;
  const formatNumber = new Intl.NumberFormat("da-DK");
  const challenges = [
    { kind: "stars", goal: 10, label: "Saml 10 stjerner" },
    { kind: "distance", goal: 1500, label: "Løb 1.500 meter" },
    { kind: "powerups", goal: 2, label: "Find 2 magiske hjælpere" },
  ];

  function loadSave() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
      return {
        best: Number.isFinite(saved.best) && saved.best > 0 ? Math.floor(saved.best) : 0,
        runs: Number.isFinite(saved.runs) && saved.runs > 0 ? Math.floor(saved.runs) : 0,
        bestDistance: Number.isFinite(saved.bestDistance) && saved.bestDistance > 0
          ? Math.floor(saved.bestDistance)
          : 0,
        challengeWins: Number.isFinite(saved.challengeWins) && saved.challengeWins > 0
          ? Math.floor(saved.challengeWins)
          : 0,
        sound: saved.sound !== false,
      };
    } catch {
      return { best: 0, runs: 0, bestDistance: 0, challengeWins: 0, sound: true };
    }
  }

  const save = loadSave();
  let audioContext = null;
  let state = "home";
  let lastFrame = 0;
  let elapsed = 0;
  let soundOn = save.sound;
  let score = 0;
  let distance = 0;
  let hearts = 3;
  let jumpHeight = 0;
  let jumpVelocity = 0;
  let invulnerable = 0;
  let magnetTime = 0;
  let shieldTime = 0;
  let springTime = 0;
  let challenge = null;
  let challengeComplete = false;
  let powerupsFound = 0;
  let nextObstacleAt = 440;
  let obstaclePattern = 0;
  let nextStarAt = 240;
  let nextPowerupAt = 900;
  let powerupIndex = 0;
  let nextMilestone = MILESTONE_LENGTH;
  let dragonMessage = "";
  let dragonMessageTime = 0;
  let obstacles = [];
  let stars = [];
  let powerups = [];
  let clouds = [];

  function persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch {
      // The game remains playable when browser storage is unavailable.
    }
  }

  function tone(frequency, duration = 0.12, type = "sine") {
    if (!soundOn) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gain.gain.setValueAtTime(0.08, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch {
      // Audio is an optional extra; unsupported browsers play silently.
    }
  }

  function updateHud() {
    ui.score.textContent = formatNumber.format(score);
    const remaining = MILESTONE_LENGTH - (Math.floor(distance) % MILESTONE_LENGTH);
    ui.distance.textContent = `${formatNumber.format(remaining)} m`;
    ui.lives.textContent = "❤️".repeat(hearts) + "🤍".repeat(3 - hearts);
    ui.lives.setAttribute("aria-label", `${hearts} af 3 hjerter`);
    if (state === "playing" && magnetTime > 0) {
      ui.tip.textContent = `🧲 Stjernemagnet: ${Math.ceil(magnetTime)} sekunder`;
    } else if (state === "playing" && shieldTime > 0) {
      ui.tip.textContent = `🫧 Tryg boble: ${Math.ceil(shieldTime)} sekunder`;
    } else if (state === "playing" && springTime > 0) {
      ui.tip.textContent = `🪽 Superhop: ${Math.ceil(springTime)} sekunder`;
    } else if (state === "playing" && challenge) {
      ui.tip.textContent = challengeComplete ? "✨ Opgave klaret! Pjuske er stolt!" : `⭐ Opgave: ${challenge.label}`;
    } else {
      ui.tip.textContent = "Et godt hop hjælper dig over forhindringerne!";
    }
  }

  function tellDragon(message) {
    dragonMessage = message;
    dragonMessageTime = 2.6;
  }

  function getDifficulty(at = distance) {
    return Math.min(18, Math.floor(at / 1500));
  }

  function isForkStretch(at) {
    const position = at % 1800;
    return position >= 600 && position < 1120;
  }

  function ensureWorldContent() {
    while (nextObstacleAt < distance + 1500) {
      const difficulty = getDifficulty(nextObstacleAt);
      const paired = obstaclePattern % 2 === 1;
      const kind = obstaclePattern % 3 === 1 ? "log" : "rock";
      if (!isForkStretch(nextObstacleAt)) obstacles.push({ at: nextObstacleAt, hit: false, kind });
      if (paired && !isForkStretch(nextObstacleAt + 235)) {
        obstacles.push({
          at: nextObstacleAt + 235,
          hit: false,
          kind: kind === "log" ? "rock" : "log",
        });
      }
      const groupGap = paired ? 455 : 365 - difficulty * 2;
      nextObstacleAt += groupGap;
      obstaclePattern += 1;
    }

    while (nextStarAt < distance + 1500) {
      if (isForkStretch(nextStarAt)) {
        stars.push({ at: nextStarAt, y: GROUND - 38, value: 1, collected: false });
        stars.push({ at: nextStarAt, y: GROUND - 132, value: 2, collected: false });
      } else {
        stars.push({
          at: nextStarAt,
          y: GROUND - 95 - (Math.floor(nextStarAt / 115) % 3) * 15,
          value: 1,
          collected: false,
        });
      }
      nextStarAt += 115;
    }

    while (nextPowerupAt < distance + 1500) {
      const kinds = ["magnet", "shield", "spring"];
      powerups.push({ at: nextPowerupAt, kind: kinds[powerupIndex % kinds.length], collected: false });
      nextPowerupAt += 1050;
      powerupIndex += 1;
    }
  }

  function challengeProgress() {
    if (!challenge) return 0;
    if (challenge.kind === "stars") return score;
    if (challenge.kind === "distance") return Math.floor(distance);
    return powerupsFound;
  }

  function checkChallenge() {
    if (!challenge || challengeComplete || challengeProgress() < challenge.goal) return;
    challengeComplete = true;
    save.challengeWins += 1;
    persist();
    tellDragon(save.challengeWins <= 3 ? "Jubii! Et nyt tørklæde!" : "Jubii! Du klarede din opgave!");
  }

  function showHome() {
    if (state === "paused") {
      save.best = Math.max(save.best, score);
      save.bestDistance = Math.max(save.bestDistance, Math.floor(distance));
      persist();
    }
    state = "home";
    score = 0;
    distance = 0;
    hearts = 3;
    jumpHeight = 0;
    jumpVelocity = 0;
    obstacles = [];
    stars = [];
    powerups = [];
    ui.screen.hidden = false;
    ui.pauseCard.hidden = true;
    ui.pause.hidden = true;
    ui.jump.hidden = true;
    ui.emoji.textContent = "🏰";
    ui.eyebrow.textContent = "ET SJOVT LØBEEVENTYR";
    ui.title.textContent = "Hjælp Liva til slottet!";
    ui.copy.textContent = "Løb så langt du kan! Hop over sten, vælg en stjernesti, og find magiske hjælpere. Slottet holder fest for dig for hver 1.000 meter!";
    ui.play.textContent = "LAD OS LØBE! 🏃";
    ui.record.textContent = `Længste løb: ${formatNumber.format(save.bestDistance)} m · ${formatNumber.format(save.best)} stjerner`;
    ui.record.textContent += ` · Tørklæder: ${Math.min(3, save.challengeWins)} af 3`;
    updateHud();
  }

  function beginRun() {
    state = "playing";
    score = 0;
    distance = 0;
    hearts = 3;
    jumpHeight = 0;
    jumpVelocity = 0;
    invulnerable = 0;
    magnetTime = 0;
    shieldTime = 0;
    springTime = 0;
    powerupsFound = 0;
    challengeComplete = false;
    elapsed = 0;
    nextObstacleAt = 440;
    obstaclePattern = 0;
    nextStarAt = 240;
    nextPowerupAt = 900;
    powerupIndex = 0;
    nextMilestone = MILESTONE_LENGTH;
    dragonMessage = "";
    dragonMessageTime = 0;
    challenge = { ...challenges[save.runs % challenges.length] };
    obstacles = [];
    stars = [];
    powerups = [];
    ensureWorldContent();
    clouds = Array.from({ length: 8 }, (_, i) => ({
      x: i * 155 + Math.random() * 70,
      y: 45 + Math.random() * 140,
      size: 25 + Math.random() * 25,
    }));
    save.runs += 1;
    persist();
    ui.screen.hidden = true;
    ui.pauseCard.hidden = true;
    ui.pause.hidden = false;
    ui.jump.hidden = false;
    updateHud();
    tone(523, 0.11);
  }

  function pauseRun() {
    if (state !== "playing" && state !== "paused") return;
    state = state === "playing" ? "paused" : "playing";
    ui.pauseCard.hidden = state !== "paused";
    ui.pause.textContent = state === "paused" ? "▶" : "Ⅱ";
    ui.pause.setAttribute("aria-label", state === "paused" ? "Fortsæt spillet" : "Sæt spillet på pause");
  }

  function jump() {
    if (state !== "playing" || jumpHeight > 0) return;
    jumpVelocity = 680;
    tone(660, 0.08);
  }

  function syncFullscreen() {
    const isStandalone = window.navigator.standalone === true
      || window.matchMedia("(display-mode: standalone)").matches
      || (!document.fullscreenElement && window.matchMedia("(display-mode: fullscreen)").matches);
    const isFullscreen = Boolean(document.fullscreenElement || isStandalone);
    document.body.classList.toggle("fullscreen-mode", isFullscreen);
    document.body.classList.toggle("is-standalone", isStandalone);
    ui.fullscreen.hidden = isStandalone;
    ui.fullscreen.setAttribute("aria-label", isFullscreen ? "Afslut fuld skærm" : "Vis fuld skærm");
    ui.fullscreenHint.hidden = true;
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    if (document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
        return;
      } catch {
        // iPhone Safari only offers full-screen mode for installed web apps.
      }
    }
    ui.fullscreenHint.textContent = "På iPhone: tryk Del og vælg Føj til hjemmeskærm for fuld skærm.";
    ui.fullscreenHint.hidden = false;
  }

  function enterFullscreen() {
    if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
    document.documentElement.requestFullscreen().catch(() => {});
  }

  function finish() {
    state = "result";
    save.best = Math.max(save.best, score);
    save.bestDistance = Math.max(save.bestDistance, Math.floor(distance));
    persist();
    ui.pause.hidden = true;
    ui.jump.hidden = true;
    ui.screen.hidden = false;
    ui.emoji.textContent = "💛";
    ui.eyebrow.textContent = "SIKKE EN MODIG TUR!";
    ui.title.textContent = "Liva tager en lille pause!";
    const challengeResult = challengeComplete
      ? " Du klarede din lille opgave!"
      : ` Din opgave var: ${challenge.label.toLowerCase()}.`;
    ui.copy.textContent = `Du samlede ${formatNumber.format(score)} stjerner og løb ${formatNumber.format(Math.floor(distance))} meter.${challengeResult} Prøv igen – Pjuske hepper på dig!`;
    ui.play.textContent = "PRØV IGEN! ✨";
    ui.record.textContent = `Længste løb: ${formatNumber.format(save.bestDistance)} m · ${formatNumber.format(save.best)} stjerner`;
    ui.record.textContent += ` · Tørklæder: ${Math.min(3, save.challengeWins)} af 3`;
    tone(330, 0.16);
  }

  function update(delta) {
    if (state !== "playing") return;
    elapsed += delta;
    const difficulty = getDifficulty();
    const speed = SPEED + difficulty * 3;
    distance += speed * delta;
    jumpHeight = Math.max(0, jumpHeight + jumpVelocity * (springTime > 0 ? 1.16 : 1) * delta);
    if (jumpHeight === 0) jumpVelocity = 0;
    else jumpVelocity -= 1750 * delta;
    invulnerable = Math.max(0, invulnerable - delta);
    magnetTime = Math.max(0, magnetTime - delta);
    shieldTime = Math.max(0, shieldTime - delta);
    springTime = Math.max(0, springTime - delta);
    dragonMessageTime = Math.max(0, dragonMessageTime - delta);
    ensureWorldContent();
    clouds.forEach((cloud) => {
      cloud.x -= 9 * delta;
      if (cloud.x < -80) cloud.x = WIDTH + 60;
    });

    for (const star of stars) {
      const heroTop = GROUND - jumpHeight - 57;
      const heroBottom = GROUND - jumpHeight;
      const starTop = star.y - 15;
      const starBottom = star.y + 15;
      if (
        !star.collected
        && Math.abs(star.at - distance) < (magnetTime > 0 ? 115 : 32)
        && (magnetTime > 0 || (starBottom >= heroTop && starTop <= heroBottom))
      ) {
        star.collected = true;
        score += star.value || 1;
        if (score % 5 === 0) tellDragon("Flot samlet!");
        tone(880, 0.08);
      }
    }

    for (const powerup of powerups) {
      if (powerup.collected || Math.abs(powerup.at - distance) > 40) continue;
      powerup.collected = true;
      powerupsFound += 1;
      if (powerup.kind === "magnet") {
        magnetTime = 7;
        tellDragon("Stjernemagnet! Fedt!");
      } else if (powerup.kind === "shield") {
        shieldTime = 9;
        tellDragon("En tryg boble beskytter dig!");
      } else {
        springTime = 8;
        tellDragon("Superhop i otte sekunder!");
      }
      tone(740, 0.12);
    }

    for (const obstacle of obstacles) {
      if (obstacle.hit || Math.abs(obstacle.at - distance) > 39) continue;
      obstacle.hit = true;
      if (jumpHeight < 52 && (shieldTime > 0 || invulnerable === 0)) {
        if (shieldTime > 0) {
          shieldTime = 0;
          tellDragon("Boblen reddede dig!");
        } else {
          hearts -= 1;
          invulnerable = 1.2;
          tellDragon("Pjuske hepper på dig!");
          tone(220, 0.18, "triangle");
          if (hearts === 0) {
            updateHud();
            finish();
            return;
          }
        }
      }
    }

    while (distance >= nextMilestone) {
      nextMilestone += MILESTONE_LENGTH;
      tellDragon("Hurra! Endnu et slot!");
      tone(784, 0.16);
    }
    checkChallenge();
    obstacles = obstacles.filter((obstacle) => obstacle.at > distance - 100);
    stars = stars.filter((star) => !star.collected && star.at > distance - 100);
    powerups = powerups.filter((powerup) => !powerup.collected && powerup.at > distance - 100);
    updateHud();
  }

  function roundedRect(x, y, width, height, radius, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
  }

  function drawCloud(x, y, size) {
    ctx.fillStyle = "#ffffffd9";
    ctx.beginPath();
    ctx.arc(x, y, size * 0.55, Math.PI, 0);
    ctx.arc(x + size * 0.55, y - size * 0.24, size * 0.7, Math.PI, 0);
    ctx.arc(x + size * 1.15, y, size * 0.5, Math.PI, 0);
    ctx.lineTo(x + size * 1.65, y + size * 0.35);
    ctx.lineTo(x, y + size * 0.35);
    ctx.closePath();
    ctx.fill();
  }

  function drawDragon(x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#f18b77";
    ctx.beginPath();
    ctx.moveTo(-48, 9);
    ctx.quadraticCurveTo(-82, -8, -75, -28);
    ctx.quadraticCurveTo(-51, -21, -35, -5);
    ctx.fill();
    ctx.fillStyle = "#99d879";
    ctx.beginPath();
    ctx.ellipse(0, 0, 43, 31, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffe98d";
    ctx.beginPath();
    ctx.ellipse(17, 14, 23, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7ec95f";
    ctx.beginPath();
    ctx.moveTo(-19, -21);
    ctx.lineTo(-30, -52);
    ctx.lineTo(-5, -31);
    ctx.moveTo(8, -26);
    ctx.lineTo(17, -55);
    ctx.lineTo(28, -25);
    ctx.fill();
    ctx.fillStyle = "#99d879";
    ctx.beginPath();
    ctx.arc(24, -10, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(31, -17, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#294d59";
    ctx.beginPath();
    ctx.arc(34, -16, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ef9289";
    ctx.beginPath();
    ctx.arc(43, -3, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#426750";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(40, 2, 7, 0.1, 1.4);
    ctx.stroke();
    ctx.restore();
  }

  function drawHero(x, ground, height) {
    const bob = state === "playing" && height === 0 ? Math.sin(elapsed * 15) * 2 : 0;
    const y = ground - height + bob;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = "#536879";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-6, -13);
    ctx.lineTo(-12, -1);
    ctx.moveTo(8, -13);
    ctx.lineTo(13, -2);
    ctx.stroke();
    ctx.fillStyle = "#f6bd91";
    ctx.beginPath();
    ctx.arc(0, -39, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#674e42";
    ctx.beginPath();
    ctx.arc(-2, -47, 17, Math.PI, Math.PI * 2);
    ctx.lineTo(15, -38);
    ctx.quadraticCurveTo(3, -44, -15, -35);
    ctx.fill();
    ctx.fillStyle = "#365f93";
    ctx.beginPath();
    ctx.roundRect(-16, -23, 32, 30, 10);
    ctx.fill();
    ctx.fillStyle = "#f6bd91";
    ctx.beginPath();
    ctx.arc(5, -40, 2, 0, Math.PI * 2);
    ctx.fill();
    const scarfColors = ["#fb7185", "#36b9a5", "#ffcb55", "#a78bfa"];
    ctx.fillStyle = scarfColors[Math.min(3, save.challengeWins)];
    ctx.beginPath();
    ctx.roundRect(-21, -20, 8, 20, 4);
    ctx.fill();
    ctx.restore();
  }

  function drawCastle(x, ground) {
    ctx.fillStyle = "#f8d992";
    ctx.fillRect(x, ground - 122, 142, 122);
    ctx.fillStyle = "#eabf72";
    ctx.fillRect(x + 12, ground - 148, 36, 150);
    ctx.fillRect(x + 94, ground - 148, 36, 150);
    ctx.fillStyle = "#bd7584";
    ctx.beginPath();
    ctx.moveTo(x + 7, ground - 148);
    ctx.lineTo(x + 30, ground - 183);
    ctx.lineTo(x + 53, ground - 148);
    ctx.moveTo(x + 89, ground - 148);
    ctx.lineTo(x + 112, ground - 183);
    ctx.lineTo(x + 135, ground - 148);
    ctx.fill();
    ctx.fillStyle = "#86cbd5";
    for (const windowX of [24, 105]) {
      ctx.beginPath();
      ctx.roundRect(x + windowX, ground - 127, 13, 20, 7);
      ctx.fill();
    }
    ctx.fillStyle = "#965c5c";
    ctx.beginPath();
    ctx.roundRect(x + 57, ground - 58, 29, 58, [15, 15, 0, 0]);
    ctx.fill();
    ctx.fillStyle = "#e6b94f";
    ctx.beginPath();
    ctx.arc(x + 79, ground - 29, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawScene() {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#91ddf5");
    sky.addColorStop(0.67, "#d3f4e8");
    sky.addColorStop(1, "#9bd786");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#ffe18a";
    ctx.beginPath();
    ctx.arc(790, 94, 43, 0, Math.PI * 2);
    ctx.fill();
    clouds.forEach((cloud) => drawCloud(cloud.x, cloud.y, cloud.size));

    ctx.fillStyle = "#9fdba8";
    ctx.beginPath();
    ctx.moveTo(0, 302);
    ctx.quadraticCurveTo(205, 202, 410, 304);
    ctx.quadraticCurveTo(670, 208, 960, 301);
    ctx.lineTo(960, GROUND);
    ctx.lineTo(0, GROUND);
    ctx.fill();
    ctx.fillStyle = "#78cb91";
    ctx.beginPath();
    ctx.moveTo(0, 351);
    ctx.quadraticCurveTo(220, 270, 444, 352);
    ctx.quadraticCurveTo(730, 268, 960, 353);
    ctx.lineTo(960, GROUND);
    ctx.lineTo(0, GROUND);
    ctx.fill();

    const milestoneRemaining = MILESTONE_LENGTH - (distance % MILESTONE_LENGTH);
    const castleX = state === "home" ? 760 : 245 + milestoneRemaining * 0.7;
    if (state === "home" || milestoneRemaining <= 700) drawCastle(castleX, GROUND);
    ctx.fillStyle = "#79c96f";
    ctx.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND);
    ctx.fillStyle = "#d4a96c";
    ctx.fillRect(0, GROUND + 25, WIDTH, HEIGHT - GROUND - 25);
    ctx.fillStyle = "#82ce77";
    ctx.fillRect(0, GROUND, WIDTH, 13);

    for (let i = 0; i < 13; i += 1) {
      const x = (i * 103 - distance * 0.65 % 103 + 103) % WIDTH;
      ctx.fillStyle = i % 2 ? "#fff4b0" : "#fff";
      ctx.beginPath();
      ctx.ellipse(x, GROUND + 55 + (i % 2) * 16, 6, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const routeY of [GROUND - 38, GROUND - 132]) {
      const routeStars = stars.filter((star) => star.y === routeY && isForkStretch(star.at));
      ctx.strokeStyle = routeY === GROUND - 38 ? "#fff8d899" : "#fff9a899";
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 8]);
      ctx.beginPath();
      let drawingRoute = false;
      let previousAt = -Infinity;
      for (const star of routeStars) {
        const x = 245 + (star.at - distance) * 1.04;
        if (star.at - previousAt > 120) drawingRoute = false;
        if (!drawingRoute) ctx.moveTo(x, routeY);
        else ctx.lineTo(x, routeY);
        drawingRoute = true;
        previousAt = star.at;
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const obstacle of obstacles) {
      const x = 245 + (obstacle.at - distance) * 1.04;
      if (x < -70 || x > WIDTH + 70) continue;
      if (obstacle.kind === "log") {
        roundedRect(x - 28, GROUND - 22, 56, 24, 11, "#9b684b");
        ctx.fillStyle = "#c28a5f";
        ctx.beginPath();
        ctx.ellipse(x + 19, GROUND - 10, 7, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#87979b";
        ctx.beginPath();
        ctx.moveTo(x - 22, GROUND);
        ctx.quadraticCurveTo(x - 20, GROUND - 34, x, GROUND - 37);
        ctx.quadraticCurveTo(x + 23, GROUND - 31, x + 23, GROUND);
        ctx.fill();
        ctx.fillStyle = "#aab8b7";
        ctx.beginPath();
        ctx.arc(x - 6, GROUND - 22, 5, Math.PI, 0);
        ctx.fill();
      }
    }

    for (const star of stars) {
      if (star.collected) continue;
      const x = 245 + (star.at - distance) * 1.04;
      if (x < -30 || x > WIDTH + 30) continue;
      const shimmer = Math.sin(elapsed * 5 + star.at) * 3;
      ctx.save();
      ctx.translate(x, star.y + shimmer);
      ctx.fillStyle = "#ffca4e";
      ctx.strokeStyle = "#fff2a8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let point = 0; point < 10; point += 1) {
        const radius = point % 2 ? 7 : 15;
        const angle = point * Math.PI / 5 - Math.PI / 2;
        if (point === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    const powerupIcons = { magnet: "🧲", shield: "🫧", spring: "🪽" };
    for (const powerup of powerups) {
      if (powerup.collected) continue;
      const x = 245 + (powerup.at - distance) * 1.04;
      if (x < -35 || x > WIDTH + 35) continue;
      ctx.font = "30px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(powerupIcons[powerup.kind], x, GROUND - 49);
    }

    const dragonX = state === "home" ? 715 : Math.max(105, 55 + Math.min(1, distance / 6000) * 150 + (hearts < 3 ? 18 : 0));
    drawDragon(dragonX, GROUND - 45 + Math.sin(elapsed * 4) * 5, 1.03);
    if (dragonMessageTime > 0 && state === "playing") {
      ctx.font = "800 14px Nunito, sans-serif";
      const messageWidth = Math.min(330, ctx.measureText(dragonMessage).width + 28);
      const bubbleX = Math.min(WIDTH - messageWidth - 12, Math.max(12, dragonX - messageWidth / 2));
      roundedRect(bubbleX, GROUND - 126, messageWidth, 34, 12, "#fffef4");
      ctx.fillStyle = "#365f65";
      ctx.textAlign = "center";
      ctx.fillText(dragonMessage, bubbleX + messageWidth / 2, GROUND - 104, messageWidth - 16);
    }
    drawHero(245, GROUND, jumpHeight);

    if (state === "playing" && challenge) {
      const progress = Math.min(challenge.goal, challengeProgress());
      const label = `OPGAVE: ${challenge.label} · ${formatNumber.format(progress)}/${formatNumber.format(challenge.goal)}`;
      ctx.font = "800 16px Nunito, sans-serif";
      const bannerWidth = Math.min(WIDTH - 30, ctx.measureText(label).width + 28);
      roundedRect((WIDTH - bannerWidth) / 2, 16, bannerWidth, 34, 12, "#fffef4eF");
      ctx.fillStyle = "#365f65";
      ctx.textAlign = "center";
      ctx.fillText(label, WIDTH / 2, 39, bannerWidth - 18);
    } else if (state === "home") {
      ctx.fillStyle = "#fff";
      ctx.font = "800 18px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Liva, Pjuske og en hel bunke stjerner!", WIDTH / 2, 493);
    }

    if (state === "playing") {
      const activeEffects = [
        magnetTime > 0 && `🧲 ${Math.ceil(magnetTime)}s`,
        shieldTime > 0 && `🫧 ${Math.ceil(shieldTime)}s`,
        springTime > 0 && `🪽 ${Math.ceil(springTime)}s`,
      ].filter(Boolean).join("  ·  ");
      if (activeEffects) {
        ctx.font = "800 16px Nunito, sans-serif";
        const statusWidth = Math.min(WIDTH - 30, ctx.measureText(activeEffects).width + 28);
        roundedRect((WIDTH - statusWidth) / 2, 58, statusWidth, 34, 12, "#fffef4eF");
        ctx.fillStyle = "#365f65";
        ctx.textAlign = "center";
        ctx.fillText(activeEffects, WIDTH / 2, 81, statusWidth - 18);
      }
    }
  }

  function frame(now) {
    const delta = Math.min((now - (lastFrame || now)) / 1000, 0.04);
    lastFrame = now;
    update(delta);
    drawScene();
    requestAnimationFrame(frame);
  }

  ui.play.addEventListener("click", () => {
    beginRun();
    enterFullscreen();
  });
  ui.jump.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    jump();
  });
  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    event.preventDefault();
    jump();
  });
  ui.fullscreen.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", syncFullscreen);
  window.matchMedia("(display-mode: standalone)").addEventListener("change", syncFullscreen);
  window.matchMedia("(display-mode: fullscreen)").addEventListener("change", syncFullscreen);
  ui.pause.addEventListener("click", pauseRun);
  ui.resume.addEventListener("click", pauseRun);
  ui.home.addEventListener("click", showHome);
  ui.sound.addEventListener("click", () => {
    soundOn = !soundOn;
    save.sound = soundOn;
    persist();
    ui.sound.textContent = soundOn ? "🔊" : "🔇";
    ui.sound.setAttribute("aria-label", soundOn ? "Slå lyd fra" : "Slå lyd til");
    if (soundOn) tone(600, 0.08);
  });
  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") {
      event.preventDefault();
      if (state === "paused") pauseRun();
      else jump();
    } else if (event.code === "Escape" || event.code === "KeyP") {
      pauseRun();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "playing") pauseRun();
  });
  window.addEventListener("blur", () => {
    if (state === "playing") pauseRun();
  });

  ui.sound.textContent = soundOn ? "🔊" : "🔇";
  ui.sound.setAttribute("aria-label", soundOn ? "Slå lyd fra" : "Slå lyd til");
  syncFullscreen();
  showHome();
  requestAnimationFrame(frame);
})();
