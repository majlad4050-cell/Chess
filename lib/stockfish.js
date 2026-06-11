/* Stockfish.js - موتور شطرنج قوی */

class Stockfish {
  constructor() {
    this.depth = 4;
    this.maxTime = 1000;
  }

  /* Minimax با Alpha-Beta Pruning */
  static minimax(board, depth, alpha, beta, isMaximizing, color) {
    if (depth === 0) {
      return { score: this.evaluateBoard(board, color), move: null };
    }

    const moves = this.getAllLegalMoves(board, isMaximizing ? color : (color === "white" ? "black" : "white"));
    
    if (moves.length === 0) {
      if (this.isInCheck(board, isMaximizing ? color : (color === "white" ? "black" : "white"))) {
        return { score: isMaximizing ? -10000 : 10000, move: null };
      }
      return { score: 0, move: null };
    }

    let bestMove = null;

    if (isMaximizing) {
      let maxScore = -Infinity;
      for (let move of moves) {
        const tempBoard = this.cloneBoard(board);
        this.makeMove(tempBoard, move.from.r, move.from.c, move.to.r, move.to.c);
        
        const result = this.minimax(tempBoard, depth - 1, alpha, beta, false, color);
        
        if (result.score > maxScore) {
          maxScore = result.score;
          bestMove = move;
        }
        
        alpha = Math.max(alpha, result.score);
        if (beta <= alpha) break;
      }
      return { score: maxScore, move: bestMove };
    } else {
      let minScore = Infinity;
      for (let move of moves) {
        const tempBoard = this.cloneBoard(board);
        this.makeMove(tempBoard, move.from.r, move.from.c, move.to.r, move.to.c);
        
        const result = this.minimax(tempBoard, depth - 1, alpha, beta, true, color);
        
        if (result.score < minScore) {
          minScore = result.score;
          bestMove = move;
        }
        
        beta = Math.min(beta, result.score);
        if (beta <= alpha) break;
      }
      return { score: minScore, move: bestMove };
    }
  }

  /* ارزیابی موضعیت */
  static evaluateBoard(board, color) {
    let score = 0;
    const pieceValues = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 1000 };

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        const value = pieceValues[piece.type] || 0;
        if (piece.color === color) {
          score += value;
        } else {
          score -= value;
        }
      }
    }

    return score;
  }

  /* گرفتن تمام حرکات قانونی */
  static getAllLegalMoves(board, color) {
    const moves = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece || piece.color !== color) continue;

        const pieceMoves = this.getPieceMoves(board, r, c, piece);
        
        for (let move of pieceMoves) {
          const tempBoard = this.cloneBoard(board);
          this.makeMove(tempBoard, r, c, move.r, move.c);
          
          if (!this.isInCheck(tempBoard, color)) {
            moves.push({ from: { r, c }, to: move });
          }
        }
      }
    }

    return moves;
  }

  /* حرکات یک مهره */
  static getPieceMoves(board, r, c, piece) {
    const moves = [];
    const inside = (rr, cc) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8;
    const enemy = (rr, cc) => board[rr][cc] && board[rr][cc].color !== piece.color;

    if (piece.type === "pawn") {
      const dir = piece.color === "white" ? -1 : 1;
      if (inside(r + dir, c) && !board[r + dir][c]) {
        moves.push({ r: r + dir, c });
        const start = piece.color === "white" ? 6 : 1;
        if (r === start && !board[r + 2 * dir][c]) moves.push({ r: r + 2 * dir, c });
      }
      [[dir, 1], [dir, -1]].forEach(d => {
        const rr = r + d[0], cc = c + d[1];
        if (inside(rr, cc) && enemy(rr, cc)) moves.push({ r: rr, c: cc });
      });
    }

    if (piece.type === "rook" || piece.type === "queen") {
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => {
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

    if (piece.type === "bishop" || piece.type === "queen") {
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(d => {
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

    if (piece.type === "knight") {
      [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]].forEach(d => {
        const rr = r + d[0], cc = c + d[1];
        if (inside(rr, cc) && (!board[rr][cc] || enemy(rr, cc))) moves.push({ r: rr, c: cc });
      });
    }

    if (piece.type === "king") {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const rr = r + dr, cc = c + dc;
          if (inside(rr, cc) && (!board[rr][cc] || enemy(rr, cc))) moves.push({ r: rr, c: cc });
        }
      }
    }

    return moves;
  }

  /* بررسی Check */
  static isInCheck(board, color) {
    let kingPos = null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]?.type === "king" && board[r][c].color === color) {
          kingPos = { r, c };
          break;
        }
      }
    }

    if (!kingPos) return false;

    const enemyColor = color === "white" ? "black" : "white";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece || piece.color !== enemyColor) continue;

        const moves = this.getPieceMoves(board, r, c, piece);
        if (moves.some(m => m.r === kingPos.r && m.c === kingPos.c)) return true;
      }
    }

    return false;
  }

  /* کپی صفحه */
  static cloneBoard(board) {
    return board.map(row => [...row]);
  }

  /* انجام حرکت */
  static makeMove(board, r1, c1, r2, c2) {
    const piece = board[r1][c1];
    if (piece.type === "pawn" && (r2 === 0 || r2 === 7)) {
      piece.type = "queen";
    }
    board[r2][c2] = piece;
    board[r1][c1] = null;
  }

  /* بهترین حرکت */
  static getBestMove(board, color, depth = 4) {
    const result = this.minimax(board, depth, -Infinity, Infinity, true, color);
    return result.move;
  }
}
