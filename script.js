(() => {
  "use strict";

  /* ===== الإعدادات ===== */
  const COLS = 5;
  const ROWS = 5;
  const TOTAL_ROUNDS = 5;
  const ROUND_SECONDS = 20;
  const AI_DELAY = [900, 1800]; // سرعة المنافس (ملي ثانية)

  const LETTERS = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي".split("");

  /* ===== عناصر الصفحة ===== */
  const $ = (id) => document.getElementById(id);
  const boardEl = $("board");
  const overlay = $("overlay");
  const overlayTitle = $("overlayTitle");
  const overlayText = $("overlayText");
  const overlayBtn = $("overlayBtn");
  const timerFill = $("timerFill");
  const timeLeftEl = $("timeLeft");
  const roundNumEl = $("roundNum");
  const roundDotsEl = $("roundDots");
  const avatars = document.querySelectorAll(".avatar");

  $("roundTotal").textContent = TOTAL_ROUNDS;

  /* ===== الحالة ===== */
  let round = 1;
  let totals = [0, 0];       // مجموع النقاط عبر الجولات
  let roundPts = [0, 0];     // نقاط الجولة الحالية
  let cells = [];            // { el, owner, pts }
  let timeLeft = ROUND_SECONDS;
  let tickId = null;
  let aiId = null;
  let running = false;

  /* ===== أدوات ===== */
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = rand(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /* ===== بناء الشبكة ===== */
  function buildBoard() {
    boardEl.innerHTML = "";
    cells = [];
    const letters = shuffle(LETTERS).slice(0, COLS * ROWS);
    let k = 0;

    for (let r = 0; r < ROWS; r++) {
      const row = document.createElement("div");
      row.className = "row";
      row.setAttribute("role", "row");

      for (let c = 0; c < COLS; c++) {
        const pts = rand(1, 5);
        const btn = document.createElement("button");
        btn.className = "hex";
        btn.type = "button";
        btn.setAttribute("role", "gridcell");
        btn.innerHTML =
          `<span class="hex__face">${letters[k]}</span>` +
          `<span class="hex__pts">${pts}</span>`;

        const cell = { el: btn, owner: null, pts };
        const idx = cells.length;
        btn.addEventListener("click", () => claim(idx, 0));
        cells.push(cell);
        row.appendChild(btn);
        k++;
      }
      boardEl.appendChild(row);
    }
  }

  /* ===== الاستيلاء على خلية ===== */
  function claim(idx, player) {
    if (!running) return;
    const cell = cells[idx];
    if (cell.owner !== null) return;

    cell.owner = player;
    cell.el.classList.add("taken", player === 0 ? "mine" : "theirs", "pop");
    roundPts[player] += cell.pts;
    updateScores();

    if (cells.every((c) => c.owner !== null)) endRound();
  }

  /* ===== النقاط ومؤشر التقدم ===== */
  function updateScores() {
    $("score1").textContent = totals[0] + roundPts[0];
    $("score2").textContent = totals[1] + roundPts[1];

    const owned = [0, 0];
    cells.forEach((c) => c.owner !== null && owned[c.owner]++);
    const total = cells.length || 1;
    avatars.forEach((av, i) => {
      av.style.setProperty("--p", Math.round((owned[i] / total) * 100));
    });
  }

  /* ===== نقاط الجولات ===== */
  function renderRoundDots() {
    roundDotsEl.innerHTML = "";
    for (let i = 1; i <= TOTAL_ROUNDS; i++) {
      const d = document.createElement("i");
      if (i < round) d.className = "done";
      else if (i === round) d.className = "now";
      roundDotsEl.appendChild(d);
    }
    roundNumEl.textContent = round;
  }

  /* ===== الموقت ===== */
  function startTimer() {
    clearInterval(tickId);
    const t0 = performance.now();
    tickId = setInterval(() => {
      const elapsed = (performance.now() - t0) / 1000;
      timeLeft = Math.max(0, ROUND_SECONDS - elapsed);
      timeLeftEl.textContent = Math.ceil(timeLeft);
      timerFill.style.width = (timeLeft / ROUND_SECONDS) * 100 + "%";
      timerFill.classList.toggle("low", timeLeft <= 5);
      if (timeLeft <= 0) endRound();
    }, 100);
  }

  /* ===== المنافس (محاكاة) ===== */
  function scheduleAI() {
    clearTimeout(aiId);
    aiId = setTimeout(() => {
      if (!running) return;
      const free = cells
        .map((c, i) => (c.owner === null ? i : -1))
        .filter((i) => i >= 0);
      if (free.length) claim(free[rand(0, free.length - 1)], 1);
      scheduleAI();
    }, rand(AI_DELAY[0], AI_DELAY[1]));
  }

  /* ===== بداية ونهاية الجولة ===== */
  function startRound() {
    overlay.hidden = true;
    roundPts = [0, 0];
    buildBoard();
    renderRoundDots();
    updateScores();
    timerFill.style.width = "100%";
    running = true;
    startTimer();
    scheduleAI();
  }

  function endRound() {
    if (!running) return;
    running = false;
    clearInterval(tickId);
    clearTimeout(aiId);

    totals[0] += roundPts[0];
    totals[1] += roundPts[1];
    updateScores();

    const [a, b] = roundPts;
    const last = round >= TOTAL_ROUNDS;

    if (!last) {
      overlayTitle.textContent =
        a > b ? "كسبت الجولة 🎉" : a < b ? "المنافس كسب الجولة" : "تعادل!";
      overlayText.textContent = `نقاط الجولة: ${a} مقابل ${b}`;
      overlayBtn.textContent = "الجولة التالية";
      overlayBtn.onclick = () => { round++; startRound(); };
    } else {
      const [ta, tb] = totals;
      overlayTitle.textContent =
        ta > tb ? "أنت الفائز 🏆" : ta < tb ? "المنافس فاز" : "تعادل نهائي!";
      overlayText.textContent = `النتيجة النهائية: ${ta} مقابل ${tb}`;
      overlayBtn.textContent = "العب مرة تانية";
      overlayBtn.onclick = () => { round = 1; totals = [0, 0]; startRound(); };
    }
    overlay.hidden = false;
  }

  startRound();
})();

