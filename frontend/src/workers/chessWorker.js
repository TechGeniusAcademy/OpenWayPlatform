// ═══════════════════════════════════════════════════════════════
//  Chess AI Web Worker
//  • Minimax + Alpha-Beta pruning
//  • Quiescence search (no horizon effect)
//  • Iterative deepening with time limit
//  • MVV-LVA move ordering (Most Valuable Victim / Least Valuable Attacker)
//  • Piece-Square Tables for positional play
// ═══════════════════════════════════════════════════════════════

import { Chess } from 'chess.js';

// ─── Piece values ──────────────────────────────────────────────
const PV = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// ─── Piece-Square Tables (white perspective, mirrored for black)
const PST = {
  p: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 27, 27, 10,  5,  5,
     0,  0,  0, 22, 22,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  5,  0,  0,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
     0,  0,  0,  5,  5,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  // King midgame — stay safe, castle
  k: [
     20, 30, 10,  0,  0, 10, 30, 20,
     20, 20,  0,  0,  0,  0, 20, 20,
    -10,-20,-20,-20,-20,-20,-20,-10,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
  ],
  // King endgame — centralise
  kEnd: [
    -50,-40,-30,-20,-20,-30,-40,-50,
    -30,-20,-10,  0,  0,-10,-20,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-30,  0,  0,  0,  0,-30,-30,
    -50,-30,-30,-30,-30,-30,-30,-50,
  ],
};

const FILES = ['a','b','c','d','e','f','g','h'];

function sqIdx(sq, color) {
  const f = FILES.indexOf(sq[0]);
  const r = 8 - parseInt(sq[1], 10);
  const i = r * 8 + f;
  return color === 'w' ? i : 63 - i;
}

// Detect endgame (queens off board or few pieces)
function isEndgame(chess) {
  let queens = 0, minors = 0;
  for (const row of chess.board())
    for (const c of row)
      if (c) { if (c.type === 'q') queens++; else if (c.type !== 'p' && c.type !== 'k') minors++; }
  return queens === 0 || (queens <= 1 && minors <= 1);
}

function evalBoard(chess) {
  if (chess.isCheckmate()) return chess.turn() === 'w' ? -99000 : 99000;
  if (chess.isDraw() || chess.isStalemate()) return 0;

  const endgame = isEndgame(chess);
  let score = 0;

  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell) continue;
      const pv = PV[cell.type] || 0;
      let pt;
      if (cell.type === 'k') {
        const table = endgame ? PST.kEnd : PST.k;
        pt = table[sqIdx(cell.square, cell.color)];
      } else {
        pt = PST[cell.type] ? PST[cell.type][sqIdx(cell.square, cell.color)] : 0;
      }
      score += (cell.color === 'w' ? 1 : -1) * (pv + pt);
    }
  }

  // Mobility bonus (number of legal moves)
  score += (chess.turn() === 'w' ? 1 : -1) * chess.moves().length * 2;

  return score;
}

// MVV-LVA: most-valuable-victim / least-valuable-attacker
function mvvLva(m) {
  let score = 0;
  if (m.captured) score = (PV[m.captured] || 0) * 10 - (PV[m.piece] || 0);
  if (m.flags.includes('p')) score += 800; // promotion
  return score;
}

function sortMoves(moves) {
  return moves.sort((a, b) => mvvLva(b) - mvvLva(a));
}

// ─── Quiescence search ────────────────────────────────────────
// After depth 0, keep searching captures so we don't stop early
// at unstable positions (avoids horizon effect)
function quiesce(chess, alpha, beta) {
  const stand = evalBoard(chess);
  if (stand >= beta) return beta;
  if (stand > alpha) alpha = stand;

  // Only look at captures (and promotions)
  const caps = chess.moves({ verbose: true }).filter(m =>
    m.captured || m.flags.includes('p')
  );
  if (!caps.length) return alpha;

  for (const m of sortMoves(caps)) {
    chess.move(m);
    const score = -quiesce(chess, -beta, -alpha);
    chess.undo();
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

// ─── Alpha-Beta (negamax form) ─────────────────────────────────
let nodesSearched = 0;
let startTime = 0;
let timeLimitMs = 3000;

function alphaBeta(chess, depth, alpha, beta) {
  nodesSearched++;

  if (chess.isGameOver()) return evalBoard(chess);
  if (depth === 0) return quiesce(chess, alpha, beta);

  const moves = sortMoves(chess.moves({ verbose: true }));
  if (!moves.length) return evalBoard(chess);

  for (const m of moves) {
    // Time check every 4096 nodes
    if ((nodesSearched & 0xFFF) === 0 && Date.now() - startTime > timeLimitMs) {
      return alpha; // return best found so far
    }

    chess.move(m);
    const score = -alphaBeta(chess, depth - 1, -beta, -alpha);
    chess.undo();

    if (score >= beta) return beta; // beta cutoff
    if (score > alpha) alpha = score;
  }
  return alpha;
}

// ─── Iterative Deepening ──────────────────────────────────────
// Searches depth 1, then 2, then 3..., stopping when time runs out
// Always has a complete result from the previous iteration ready
function bestMoveIterativeDeepening(fen, maxDepth, timeLimitMs_) {
  const chess = new Chess(fen);
  const allMoves = sortMoves(chess.moves({ verbose: true }));
  if (!allMoves.length) return null;
  if (allMoves.length === 1) return allMoves[0]; // only one legal move

  startTime = Date.now();
  timeLimitMs = timeLimitMs_;
  nodesSearched = 0;

  let bestMove = allMoves[0];
  const isMaximizing = chess.turn() === 'w';

  for (let depth = 1; depth <= maxDepth; depth++) {
    // Check time before starting a new iteration
    if (depth > 1 && Date.now() - startTime > timeLimitMs * 0.5) break;

    let iterBest = null;
    let iterBestVal = -Infinity;

    for (const m of allMoves) {
      if (Date.now() - startTime > timeLimitMs) break;

      chess.move(m);
      nodesSearched++;
      // negamax: negate and flip alpha/beta
      const score = -alphaBeta(chess, depth - 1, -Infinity, Infinity);
      chess.undo();

      // Convert to white's perspective
      const val = isMaximizing ? score : -score;
      if (val > iterBestVal) { iterBestVal = val; iterBest = m; }
    }

    if (iterBest) bestMove = iterBest; // save completed iteration result
  }

  return bestMove;
}

// ─── Worker message handler ───────────────────────────────────
self.onmessage = (e) => {
  const { fen, maxDepth, timeLimit } = e.data;
  try {
    const move = bestMoveIterativeDeepening(fen, maxDepth, timeLimit || 3000);
    self.postMessage({ move, nodes: nodesSearched, time: Date.now() - startTime });
  } catch (err) {
    self.postMessage({ error: err.message });
  }
};
