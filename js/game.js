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
    sound: document.querySelector("#sound-button"),
    fullscreen: document.querySelector("#fullscreen-button"),
    fullscreenHint: document.querySelector("#fullscreen-hint"),
  };

  const SAVE_KEY = "drageflugt-save-v1";
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const GROUND = 420;
  const RUN_LENGTH = 3000;
  const SPEED = 190;
  const formatNumber = new Intl.NumberFormat("da-DK");
  const obstaclesAt = [440, 760, 1085, 1410, 1730, 2050, 2380, 2695];

  function loadSave() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
      return {
        best: Number.isFinite(saved.best) && saved.best > 0 ? Math.floor(saved.best) : 0,
        runs: Number.isFinite(saved.runs) && saved.runs > 0 ? Math.floor(saved.runs) : 0,
        sound: saved.sound !== false,
      };
    } catch {
      return { best: 0, runs: 0, sound: true };
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
  let obstacles = [];
  let stars = [];
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
    ui.distance.textContent = `${formatNumber.format(Math.max(0, Math.ceil(RUN_LENGTH - distance)))} m`;
    ui.lives.textContent = "❤️".repeat(hearts) + "🤍".repeat(3 - hearts);
    ui.lives.setAttribute("aria-label", `${hearts} af 3 hjerter`);
  }

  function showHome() {
    state = "home";
    score = 0;
    distance = 0;
    hearts = 3;
    ui.screen.hidden = false;
    ui.pauseCard.hidden = true;
    ui.pause.hidden = true;
    ui.jump.hidden = true;
    ui.emoji.textContent = "🏰";
    ui.eyebrow.textContent = "ET SJOVT LØBEEVENTYR";
    ui.title.textContent = "Hjælp Liva til slottet!";
    ui.copy.textContent = "De søde drager vil gerne lege fangeleg. Hop over sten, snup stjerner, og løb hele vejen til det trygge slot!";
    ui.play.textContent = "LAD OS LØBE! 🏃";
    ui.record.textContent = `Din bedste tur: ${formatNumber.format(save.best)} stjerner`;
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
    elapsed = 0;
    obstacles = obstaclesAt.map((at, index) => ({
      at,
      hit: false,
      kind: index % 3 === 1 ? "log" : "rock",
    }));
    stars = [];
    for (let at = 240; at < RUN_LENGTH - 100; at += 115) {
      stars.push({ at, y: GROUND - 95 - (Math.floor(at / 115) % 3) * 15, collected: false });
    }
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

  function finish(won) {
    state = "result";
    save.best = Math.max(save.best, score);
    persist();
    ui.pause.hidden = true;
    ui.jump.hidden = true;
    ui.screen.hidden = false;
    ui.emoji.textContent = won ? "🎉" : "💛";
    ui.eyebrow.textContent = won ? "DU KLAREDE DET!" : "SIKKE EN MODIG TUR!";
    ui.title.textContent = won ? "Liva er nået til slottet!" : "Dragerne fik næsten fat!";
    ui.copy.textContent = won
      ? `Du samlede ${formatNumber.format(score)} stjerner på vejen. Liva, dragen Pjuske og alle vennerne fejrer dig!`
      : `Du samlede ${formatNumber.format(score)} stjerner og løb ${formatNumber.format(Math.floor(distance))} meter. Prøv igen – du kan godt!`;
    ui.play.textContent = "PRØV IGEN! ✨";
    ui.record.textContent = `Din bedste tur: ${formatNumber.format(save.best)} stjerner`;
    if (won) tone(784, 0.16);
  }

  function update(delta) {
    if (state !== "playing") return;
    elapsed += delta;
    distance = Math.min(RUN_LENGTH, distance + SPEED * delta);
    jumpHeight = Math.max(0, jumpHeight + jumpVelocity * delta);
    if (jumpHeight === 0) jumpVelocity = 0;
    else jumpVelocity -= 1750 * delta;
    invulnerable = Math.max(0, invulnerable - delta);
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
        && Math.abs(star.at - distance) < 32
        && starBottom >= heroTop
        && starTop <= heroBottom
      ) {
        star.collected = true;
        score += 1;
        tone(880, 0.08);
      }
    }

    for (const obstacle of obstacles) {
      if (obstacle.hit || Math.abs(obstacle.at - distance) > 39) continue;
      obstacle.hit = true;
      if (jumpHeight < 52 && invulnerable === 0) {
        hearts -= 1;
        invulnerable = 1.2;
        tone(220, 0.18, "triangle");
        if (hearts === 0) {
          updateHud();
          finish(false);
          return;
        }
      }
    }

    if (distance >= RUN_LENGTH) {
      updateHud();
      finish(true);
      return;
    }
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
    ctx.fillStyle = "#fb7185";
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

    const castleX = state === "home" ? 760 : 245 + Math.max(0, RUN_LENGTH - distance) * 0.7;
    if (state === "home" || distance > RUN_LENGTH - 700) drawCastle(castleX, GROUND);
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
    for (const obstacle of obstacles) {
      const x = 245 + (obstacle.at - distance) * 1.04;
      if (x < -70 || x > WIDTH + 70 || obstacle.hit) continue;
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

    const dragonX = state === "home" ? 715 : Math.max(275, 55 + (distance / RUN_LENGTH) * 150 + (hearts < 3 ? 18 : 0));
    drawDragon(dragonX, GROUND - 45 + Math.sin(elapsed * 4) * 5, 1.03);
    drawHero(245, GROUND, jumpHeight);

    if (state === "home") {
      ctx.fillStyle = "#fff";
      ctx.font = "800 18px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Liva, Pjuske og en hel bunke stjerner!", WIDTH / 2, 493);
    }
  }

  function frame(now) {
    const delta = Math.min((now - (lastFrame || now)) / 1000, 0.04);
    lastFrame = now;
    update(delta);
    drawScene();
    requestAnimationFrame(frame);
  }

  ui.play.addEventListener("click", beginRun);
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
