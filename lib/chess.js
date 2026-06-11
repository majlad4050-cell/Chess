/* Chess.js - کتابخانه شطرنج برای تایید حرکات */

class ChessGame {
  constructor() {
    this.board = [];
    this.history = [];
    this.gameStatus = "ongoing"; // ongoing, checkmate, stalemate, draw
  }

  // بررسی اینکه مربع داخل صفحه است
  static isInsideBoard(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  // بررسی اینکه مربع توسط رنگ معین تحت حمله است
  static isSquareUnderAttack(board, r, c, byColor) {
    for (let rr = 0; rr < 8; rr++) {
      for (let cc = 0; cc < 8; cc++) {
        const piece = board[rr][cc];
        if (!piece || piece.color !== byColor) continue;
        
        const moves = this.getPseudoLegalMoves(board, rr, cc, piece);
        if (moves.some(m => m.r === r && m.c === c)) return true;
      }
    }
    return false;
  }

  // یافتن شاه
  static findKing(board, color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]?.type === "king" && board[r][c].color === color) {
          return { r, c };
        }
      }
    }
    return null;
  }

  // بررسی Check
  static isInCheck(board, color) {
    const king = this.findKing(board, color);
    if (!king) return false;
    
    const enemyColor = color === "white" ? "black" : "white";
    return this.isSquareUnderAttack(board, king.r, king.c, enemyColor);
  }

  // بررسی Checkmate
  static isCheckmate(board, color) {
    if (!this.isInCheck(board, color)) return false;
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece || piece.color !== color) continue;
        
        const moves = this.getLegalMoves(board, r, c, piece);
        if (moves.length > 0) return false;
      }
    }
    
    return true;
  }

  // بررسی Stalemate
  static isStalemate(board, color) {
    if (this.isInCheck(board, color)) return false;
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece || piece.color !== color) continue;
        
        const moves = this.getLegalMoves(board, r, c, piece);
        if (moves.length > 0) return false;
      }
    }
    
    return true;
  }

  // حرکات قانونی (بدون تابع شاه را چک کنید)
  static getPseudoLegalMoves(board, r, c, piece) {
    const moves = [];
    const inside = ChessGame.isInsideBoard;
    const enemy = (rr, cc) => board[rr][cc] && board[rr][cc].color !== piece.color;

    if (piece.type === "pawn") {
      const dir = piece.color === "white" ? -1 : 1;
      const start = piece.color === "white" ? 6 : 1;

      if (inside(r+dir, c) && !board[r+dir][c]) {
        moves.push({ r: r+dir, c });
        if (r === start && !board[r+2*dir][c]) moves.push({ r: r+2*dir, c });
      }

      [[dir,1],[dir,-1]].forEach(d => {
        const rr = r + d[0], cc = c + d[1];
        if (inside(rr, cc) && enemy(rr, cc)) moves.push({ r: rr, c: cc });
      });
    }

    if (piece.type === "rook" || piece.type === "queen") {
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(d => {
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
      [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d => {
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
      [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(d => {
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

  // حرکات قانونی (شامل تابع شاه را چک کنید)
  static getLegalMoves(board, r, c, piece) {
    const moves = this.getPseudoLegalMoves(board, r, c, piece);
    const legalMoves = [];

    for (let m of moves) {
      // حرکت موقتی
      const temp = board[m.r][m.c];
      board[m.r][m.c] = piece;
      board[r][c] = null;
      
      const stillInCheck = this.isInCheck(board, piece.color);
      
      // برگرداندن
      board[r][c] = piece;
      board[m.r][m.c] = temp;
      
      if (!stillInCheck) legalMoves.push(m);
    }

    return legalMoves;
  }

  // ارزیابی موضعیت
  static evaluatePosition(board, forColor) {
    const pieceValues = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 1000 };
    let score = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        const value = pieceValues[piece.type] || 0;
        if (piece.color === forColor) {
          score += value;
        } else {
          score -= value;
        }
      }
    }

    if (this.isInCheck(board, forColor)) score -= 50;
    if (this.isCheckmate(board, forColor)) score -= 10000;

    return score;
  }
}
