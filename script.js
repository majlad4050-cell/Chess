/* مدیریت صفحات */
const pages = {
  home: document.querySelector(".page-home"),
  game: document.querySelector(".page-game"),
  shop: document.querySelector(".page-shop"),
  friends: document.querySelector(".page-friends"),
  profile: document.querySelector(".page-profile"),
  settings: document.querySelector(".page-settings")
};

function showPage(name) {
  Object.values(pages).forEach(p => p.style.display = "none");
  pages[name].style.display = "block";
}

document.getElementById("nav-home").onclick = () => showPage("home");
document.getElementById("nav-shop").onclick = () => showPage("shop");
document.getElementById("nav-friends").onclick = () => showPage("friends");
document.getElementById("nav-profile").onclick = () => showPage("profile");
document.getElementById("nav-settings").onclick = () => showPage("settings");

/* متغیرهای شطرنج */
let board = [];
let turn = "white";
let selected = null;
let legalMoves = [];
let mode = "friend";
let playerColor = "white";
let aiColor = "black";
let aiLevel = "easy";
let gameHistory = [];
let inCheck = false;
let gameOver = false;

const boardEl = document.getElementById("board");
const statusText = document.getElementById("status-text");

/* شروع بازی با دوست */
document.getElementById("btn-friend").onclick = () => {
  mode = "friend";
  document.getElementById("ai-levels").style.display = "none";
  startGame("white");
  showPage("game");
};

/* شروع بازی با هوش مصنوعی */
document.getElementById("btn-ai").onclick = () => {
  document.getElementById("color-modal").style.display = "flex";
};

document.querySelectorAll(".modal-btn").forEach(btn => {
  btn.onclick = () => {
    playerColor = btn.dataset.color;
    aiColor = playerColor === "white" ? "black" : "white";
    mode = "ai";

    document.getElementById("color-modal").style.display = "none";
    document.getElementById("ai-levels").style.display = "flex";

    startGame(playerColor);
    showPage("game");
  };
});

document.getElementById("modal-cancel").onclick = () => {
  document.getElementById("color-modal").style.display = "none";
};

/* سطح هوش مصنوعی */
const aiButtons = document.querySelectorAll(".ai-btn");
aiButtons.forEach(btn => {
  btn.onclick = () => {
    aiButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    aiLevel = btn.dataset.level;
  };
});
const defaultAiBtn = document.querySelector('.ai-btn[data-level="easy"]');
if (defaultAiBtn) defaultAiBtn.classList.add("active");

/* ساخت صفحه شطرنج */
function startGame(bottomColor) {
  playerColor = bottomColor;
  aiColor = bottomColor === "white" ? "black" : "white";

  createEmptyBoard();
  setupPieces(bottomColor);
  drawBoard();
  drawPieces();

  turn = "white";
  selected = null;
  legalMoves = [];
  gameHistory = [];
  inCheck = false;
  gameOver = false;
  updateStatus();
  rotateBoardIfNeeded();

  // اگر بازیکن سیاه است، AI باید اولین حرکت را انجام دهد
  if (mode === "ai" && playerColor === "black") {
    setTimeout(aiMove, 600);
  }
}

function createEmptyBoard() {
  board = [];
  for (let r = 0; r < 8; r++) board.push(new Array(8).fill(null));
}

function setupPieces(bottomColor) {
  const back = ["rook","knight","bishop","queen","king","bishop","knight","rook"];

  const bottomRow = 7;
  const bottomPawn = 6;
  const topRow = 0;
  const topPawn = 1;

  const bottom = bottomColor;
  const top = bottomColor === "white" ? "black" : "white";

  for (let c = 0; c < 8; c++) {
    board[topRow][c] = { type: back[c], color: top };
    board[topPawn][c] = { type: "pawn", color: top };
  }

  for (let c = 0; c < 8; c++) {
    board[bottomRow][c] = { type: back[c], color: bottom };
    board[bottomPawn][c] = { type: "pawn", color: bottom };
  }
}

/* رندر صفحه */
function drawBoard() {
  boardEl.innerHTML = "";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.onclick = () => onCellClick(r, c);
      boardEl.appendChild(cell);
    }
  }
  applyTheme();
}

function drawPieces() {
  document.querySelectorAll(".cell").forEach(c => {
    c.innerHTML = "";
    c.classList.remove("highlight", "check");
  });

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;

      const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
      const el = document.createElement("div");
      el.className = "piece " + p.color;
      el.textContent = pieceSymbol(p);
      el.onclick = (e) => {
        e.stopPropagation();
        onPieceClick(r, c);
      };

      cell.appendChild(el);
    }
  }

  legalMoves.forEach(m => {
    const cell = document.querySelector(`.cell[data-row="${m.r}"][data-col="${m.c}"]`);
    if (cell) cell.classList.add("highlight");
  });

  // نمایش Check
  if (inCheck) {
    const king = findKing(turn);
    if (king) {
      const cell = document.querySelector(`.cell[data-row="${king.r}"][data-col="${king.c}"]`);
      if (cell) cell.classList.add("check");
    }
  }
}

function pieceSymbol(p) {
  const W = { king:"♔", queen:"♕", rook:"♖", bishop:"♗", knight:"♘", pawn:"♙" };
  const B = { king:"♚", queen:"♛", rook:"♜", bishop:"♝", knight:"♞", pawn:"♟" };
  return p.color === "white" ? W[p.type] : B[p.type];
}

/* انتخاب مهره و حرکت */
function onPieceClick(r, c) {
  if (gameOver) return;
  
  const p = board[r][c];
  if (!p || p.color !== turn) return;

  if (selected && selected.r === r && selected.c === c) {
    selected = null;
    legalMoves = [];
    drawPieces();
    return;
  }

  selected = { r, c };
  legalMoves = getLegalMoves(r, c, p);
  drawPieces();
}

function onCellClick(r, c) {
  if (!selected || gameOver) return;

  const isLegal = legalMoves.some(m => m.r === r && m.c === c);
  if (!isLegal) return;

  movePiece(selected.r, selected.c, r, c);
  gameHistory.push({ from: selected, to: { r, c } });
  selected = null;
  legalMoves = [];
  drawPieces();
  nextTurn();
}

function movePiece(r1, c1, r2, c2) {
  const p = board[r1][c1];

  if (p.type === "pawn" && (r2 === 0 || r2 === 7)) {
    showPromotionModal((type) => {
      p.type = type;
      board[r2][c2] = p;
      board[r1][c1] = null;
      drawPieces();
    });
    return;
  }

  // Castling
  if (p.type === "king" && Math.abs(c2 - c1) === 2) {
    const rookCol = c2 > c1 ? 7 : 0;
    const newRookCol = c2 > c1 ? 5 : 3;
    const rook = board[r1][rookCol];
    if (rook) {
      board[r1][newRookCol] = rook;
      board[r1][rookCol] = null;
    }
  }

  board[r2][c2] = p;
  board[r1][c1] = null;
}

function showPromotionModal(callback) {
  const modal = document.createElement("div");
  modal.className = "promotion-modal";
  modal.innerHTML = `
    <div class="promotion-box">
      <div class="promotion-title">انتخاب مهره</div>
      <button data-type="queen">♕ ملکه</button>
      <button data-type="rook">♖ رخ</button>
      <button data-type="bishop">♗ فیل</button>
      <button data-type="knight">♘ اسب</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => {
      callback(btn.dataset.type);
      modal.remove();
    };
  });
}

/* قوانین حرکت */
function getLegalMoves(r, c, p) {
  const moves = [];
  const inside = (rr, cc) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8;
  const enemy = (rr, cc) => board[rr][cc] && board[rr][cc].color !== p.color;

  if (p.type === "pawn") {
    const dir = p.color === "white" ? -1 : 1;
    const start = p.color === "white" ? 6 : 1;

    if (inside(r+dir, c) && !board[r+dir][c]) {
      moves.push({ r: r+dir, c });
      if (r === start && !board[r+2*dir][c]) moves.push({ r: r+2*dir, c });
    }

    [[dir,1],[dir,-1]].forEach(d => {
      const rr = r + d[0], cc = c + d[1];
      if (inside(rr, cc) && enemy(rr, cc)) moves.push({ r: rr, c: cc });
    });
  }

  if (p.type === "rook" || p.type === "queen") {
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    dirs.forEach(d => {
      let rr = r + d[0], cc = c + d[1];
      while (inside(rr, cc)) {
        if (!board[rr][cc]) moves.push({ r: rr, c: cc });
        else {
          if (enemy(rr, cc)) moves.push({ r: rr, c: cc });
          break;
        }
        rr += d[0];
        cc += d[1];
      }
    });
  }

  if (p.type === "bishop" || p.type === "queen") {
    const dirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
    dirs.forEach(d => {
      let rr = r + d[0], cc = c + d[1];
      while (inside(rr, cc)) {
        if (!board[rr][cc]) moves.push({ r: rr, c: cc });
        else {
          if (enemy(rr, cc)) moves.push({ r: rr, c: cc });
          break;
        }
        rr += d[0];
        cc += d[1];
      }
    });
  }

  if (p.type === "knight") {
    const jumps = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
    jumps.forEach(d => {
      const rr = r + d[0], cc = c + d[1];
      if (inside(rr, cc) && (!board[rr][cc] || enemy(rr, cc))) moves.push({ r: rr, c: cc });
    });
  }

  if (p.type === "king") {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const rr = r + dr, cc = c + dc;
        if (inside(rr, cc) && (!board[rr][cc] || enemy(rr, cc))) moves.push({ r: rr, c: cc });
      }
    }
    
    // Castling - اگر پادشاه حرکت نکرده و رخ هم حرکت نکرده
    if (p.color === "white" && r === 7 && c === 4) {
      // سمت راست (طرف شاه)
      if (board[7][7]?.type === "rook" && board[7][7].color === "white" && 
          !board[7][5] && !board[7][6]) {
        moves.push({ r: 7, c: 6 });
      }
      // سمت چپ (طرف ملکه)
      if (board[7][0]?.type === "rook" && board[7][0].color === "white" && 
          !board[7][1] && !board[7][2] && !board[7][3]) {
        moves.push({ r: 7, c: 2 });
      }
    }
    if (p.color === "black" && r === 0 && c === 4) {
      // سمت راست
      if (board[0][7]?.type === "rook" && board[0][7].color === "black" && 
          !board[0][5] && !board[0][6]) {
        moves.push({ r: 0, c: 6 });
      }
      // سمت چپ
      if (board[0][0]?.type === "rook" && board[0][0].color === "black" && 
          !board[0][1] && !board[0][2] && !board[0][3]) {
        moves.push({ r: 0, c: 2 });
      }
    }
  }

  return moves;
}

/* Check و Checkmate */
function findKing(color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.type === "king" && board[r][c].color === color) {
        return { r, c };
      }
    }
  }
  return null;
}

function isSquareUnderAttack(r, c, byColor) {
  for (let rr = 0; rr < 8; rr++) {
    for (let cc = 0; cc < 8; cc++) {
      const p = board[rr][cc];
      if (!p || p.color !== byColor) continue;
      
      const moves = getLegalMoves(rr, cc, p);
      if (moves.some(m => m.r === r && m.c === c)) return true;
    }
  }
  return false;
}

function isInCheck(color) {
  const king = findKing(color);
  if (!king) return false;
  
  const enemyColor = color === "white" ? "black" : "white";
  return isSquareUnderAttack(king.r, king.c, enemyColor);
}

function isCheckmate(color) {
  if (!isInCheck(color)) return false;
  
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== color) continue;
      
      const moves = getLegalMoves(r, c, p);
      for (let m of moves) {
        // حرکت موقتی
        const temp = board[m.r][m.c];
        board[m.r][m.c] = p;
        board[r][c] = null;
        
        const stillInCheck = isInCheck(color);
        
        // برگرداندن
        board[r][c] = p;
        board[m.r][m.c] = temp;
        
        if (!stillInCheck) return false;
      }
    }
  }
  
  return true;
}

/* نوبت بعدی */
function nextTurn() {
  turn = turn === "white" ? "black" : "white";
  
  inCheck = isInCheck(turn);
  
  if (isCheckmate(turn)) {
    gameOver = true;
    const winner = turn === "white" ? "سیاه" : "سفید";
    statusText.textContent = `🎉 برنده: ${winner} - Checkmate!`;
    return;
  }
  
  updateStatus();
  rotateBoardIfNeeded();

  if (mode === "ai" && turn === aiColor) {
    setTimeout(aiMove, 600);
  }
}

function updateStatus() {
  let status = "نوبت: " + (turn === "white" ? "سفید" : "سیاه");
  if (inCheck) status += " ⚠️ (شاه در خطر)";
  statusText.textContent = status;
}

/* چرخش صفحه — فقط در بازی با دوست */
function rotateBoardIfNeeded() {
  if (mode === "friend" && turn === "black") {
    boardEl.classList.add("rotate-board");
  } else {
    boardEl.classList.remove("rotate-board");
  }
}

/* هوش مصنوعی بهتر */
function evaluateMove(fromR, fromC, toR, toC) {
  const piece = board[fromR][fromC];
  let score = 0;

  // گرفتن مهره دشمن
  if (board[toR][toC]) {
    const values = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 100 };
    score += (values[board[toR][toC].type] || 0) * 10;
  }

  // حفاظت از مهره
  const enemyColor = piece.color === "white" ? "black" : "white";
  if (isSquareUnderAttack(toR, toC, enemyColor)) {
    const values = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 100 };
    score -= (values[piece.type] || 0) * 5;
  }

  // فروج پیاده
  if (piece.type === "pawn") {
    const dir = piece.color === "white" ? -1 : 1;
    if (toR === (piece.color === "white" ? 0 : 7)) score += 50; // Promotion
    score += Math.abs(toR - fromR) * 2;
  }

  // توسعه
  score += Math.random() * 5;

  return score;
}

function aiMove() {
  const moves = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== aiColor) continue;

      const legal = getLegalMoves(r, c, p);
      legal.forEach(m => {
        const score = evaluateMove(r, c, m.r, m.c);
        moves.push({ fromR: r, fromC: c, toR: m.r, toC: m.c, score });
      });
    }
  }

  if (moves.length === 0) return;

  let bestMove;
  if (aiLevel === "easy") {
    bestMove = moves[Math.floor(Math.random() * moves.length)];
  } else if (aiLevel === "medium") {
    moves.sort((a, b) => b.score - a.score);
    bestMove = moves[Math.floor(Math.random() * Math.min(5, moves.length))];
  } else {
    moves.sort((a, b) => b.score - a.score);
    bestMove = moves[0];
  }

  movePiece(bestMove.fromR, bestMove.fromC, bestMove.toR, bestMove.toC);
  gameHistory.push({ from: { r: bestMove.fromR, c: bestMove.fromC }, to: { r: bestMove.toR, c: bestMove.toC } });
  drawPieces();
  nextTurn();
}

/* موسیقی پس‌زمینه */
const audio = document.getElementById("bgm");
const musicBtn = document.getElementById("music-btn");
const toggleMusicBtn = document.getElementById("toggle-music");

const tracks = [
  "assets/audio/music1.mp3",
  "assets/audio/music2.mp3",
  "assets/audio/music3.mp3",
  "assets/audio/music4.mp3",
  "assets/audio/music5.mp3",
  "assets/audio/music6.mp3",
  "assets/audio/music7.mp3",
  "assets/audio/music8.mp3",
  "assets/audio/music9.mp3",
  "assets/audio/music10.mp3",
  "assets/audio/music11.mp3",
  "assets/audio/music12.mp3"
];

let musicEnabled = false;
let currentTrack = 0;

function playRandomMusic() {
  if (!musicEnabled) return;

  audio.pause();
  audio.currentTime = 0;

  const random = Math.floor(Math.random() * tracks.length);
  audio.src = tracks[random];
  currentTrack = random;

  audio.play().catch(() => {
    console.log("پخش موسیقی نیاز به لمس کاربر دارد");
  });
}

audio.addEventListener("ended", () => {
  if (musicEnabled) {
    setTimeout(playRandomMusic, 1000);
  }
});

musicBtn.onclick = () => {
  musicEnabled = !musicEnabled;
  if (musicEnabled) {
    if (toggleMusicBtn) toggleMusicBtn.textContent = "روشن";
    playRandomMusic();
  } else {
    audio.pause();
    if (toggleMusicBtn) toggleMusicBtn.textContent = "خاموش";
  }
};

if (toggleMusicBtn) {
  toggleMusicBtn.onclick = () => {
    musicEnabled = !musicEnabled;
    toggleMusicBtn.textContent = musicEnabled ? "روشن" : "خاموش";
    if (!musicEnabled) {
      audio.pause();
    } else {
      playRandomMusic();
    }
  };
}

/* تغییر تم صفحه شطرنج */
const boardThemeSelect = document.getElementById("board-theme");

function applyTheme() {
  const theme = boardThemeSelect ? (boardThemeSelect.value || "classic") : "classic";
  boardEl.classList.remove("classic", "blue", "green", "red", "gray", "purple", "gold", "darkblue");
  boardEl.classList.add(theme);

  document.querySelectorAll(".cell").forEach(cell => {
    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);
    cell.classList.remove("light", "dark");
    if ((r + c) % 2 === 0) cell.classList.add("light");
    else cell.classList.add("dark");
  });
}

if (boardThemeSelect) boardThemeSelect.onchange = applyTheme;

/* دکمه‌های کنترل بازی */
document.getElementById("back-btn").onclick = () => showPage("home");

document.getElementById("restart-btn").onclick = () => {
  if (mode === "ai") startGame(playerColor);
  else startGame("white");
};
