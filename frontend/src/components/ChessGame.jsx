import { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from './ChessBoard';
import styles from './ChessGame.module.css';

// ─── Easy move helper (synchronous, fast) ─────────────────────
// Picks a random move 60% of the time, otherwise takes any capture.
function getEasyMove(chess) {
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return null;
  if (Math.random() < 0.6) return moves[Math.floor(Math.random() * moves.length)];
  const caps = moves.filter(m => m.captured);
  return caps.length ? caps[Math.floor(Math.random() * caps.length)] : moves[Math.floor(Math.random() * moves.length)];
}

// ─── DIFFICULTIES ─────────────────────────────────────────────
// maxDepth — iterative-deepening safety cap (worker stops early via timeLimit)
// timeLimit — milliseconds the worker is allowed to think
const DIFFICULTIES = [
  { id: 'easy',   label: 'Новичок',    maxDepth: 0,  timeLimit: 0,    emoji: '🟢', desc: '~900 ELO — случайные ходы' },
  { id: 'medium', label: 'Любитель',   maxDepth: 6,  timeLimit: 800,  emoji: '🟡', desc: '~1400 ELO — думает до 0.8 с' },
  { id: 'hard',   label: 'Мастер',     maxDepth: 8,  timeLimit: 2000, emoji: '🔴', desc: '~1700 ELO — думает до 2 с' },
  { id: 'expert', label: 'ИИ-Эксперт', maxDepth: 10, timeLimit: 4000, emoji: '💜', desc: '~2000 ELO — думает до 4 с' },
];

const PIECE_ICON   = { p:'♟',n:'♞',b:'♝',r:'♜',q:'♛',k:'♚' };
const PIECE_ICON_W = { p:'♙',n:'♘',b:'♗',r:'♖',q:'♕',k:'♔' };

// ═══════════════════════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function ChessGame() {
  const [screen, setScreen] = useState('setup');
  const [difficulty, setDifficulty] = useState('medium');
  const [playerColor, setPlayerColor] = useState('white');

  const [game, setGame] = useState(new Chess());
  const [lastMove, setLastMove] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [thinkingDots, setThinkingDots] = useState(0);
  const [result, setResult] = useState(null);
  const [capByWhite, setCapByWhite] = useState([]);
  const [capByBlack, setCapByBlack] = useState([]);

  const boardRef = useRef(null);
  const [boardWidth, setBoardWidth] = useState(520);
  const workerRef = useRef(null);
  const dotsTimer = useRef(null);
  const moveListRef = useRef(null);

  // Responsive board
  useEffect(() => {
    if (!boardRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const w = Math.floor(e.contentRect.width);
        if (w > 0) setBoardWidth(Math.min(w, 840));
      }
    });
    ro.observe(boardRef.current);
    return () => ro.disconnect();
  }, [screen]);

  useEffect(() => {
    return () => { workerRef.current?.terminate(); clearInterval(dotsTimer.current); };
  }, []);

  // Auto-scroll move list
  useEffect(() => {
    if (moveListRef.current) moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
  }, [game]);

  const updateCaptures = useCallback((chess) => {
    const allPieces = { p:8, n:2, b:2, r:2, q:1, k:1 };
    const on = { w:{}, b:{} };
    for (const row of chess.board())
      for (const cell of row)
        if (cell) on[cell.color][cell.type] = (on[cell.color][cell.type]||0)+1;

    const capW=[], capB=[];
    for (const [type,count] of Object.entries(allPieces)) {
      const mW=count-(on.w[type]||0), mB=count-(on.b[type]||0);
      for(let i=0;i<mW;i++) capB.push(type);
      for(let i=0;i<mB;i++) capW.push(type);
    }
    setCapByWhite(capW); setCapByBlack(capB);
  }, []);

  const checkOver = useCallback((chess) => {
    if (chess.isCheckmate()) {
      setResult({ winner: chess.turn()==='w'?'black':'white', reason:'checkmate' });
      setScreen('result'); return true;
    }
    if (chess.isDraw()) {
      const reason = chess.isStalemate()?'stalemate':chess.isThreefoldRepetition()?'repetition':chess.isInsufficientMaterial()?'insufficient':'draw';
      setResult({ winner:'draw', reason }); setScreen('result'); return true;
    }
    return false;
  }, []);

  const applyMove = useCallback((move, currentFen) => {
    clearInterval(dotsTimer.current);
    if (!move) { setThinking(false); return; }
    const ng = new Chess(currentFen);
    try { ng.move(move); } catch { setThinking(false); return; }
    setLastMove({ from: move.from, to: move.to });
    updateCaptures(ng);
    setGame(ng);
    setThinking(false);
    checkOver(ng);
  }, [updateCaptures, checkOver]);

  const makeAIMove = useCallback((currentGame) => {
    const diff = DIFFICULTIES.find(d => d.id === difficulty) || DIFFICULTIES[1];
    setThinking(true);
    let dots = 0;
    clearInterval(dotsTimer.current);
    dotsTimer.current = setInterval(() => { dots = (dots + 1) % 4; setThinkingDots(dots); }, 400);

    const fen = currentGame.fen();

    // Easy: instant random move, no worker needed
    if (diff.id === 'easy') {
      setTimeout(() => {
        const move = getEasyMove(currentGame);
        applyMove(move, fen);
      }, 250 + Math.random() * 150);
      return;
    }

    // Medium/Hard/Expert: Web Worker with iterative deepening
    workerRef.current?.terminate();
    const worker = new Worker(
      new URL('../workers/chessWorker.js', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (e) => {
      worker.terminate();
      workerRef.current = null;
      if (e.data.error) {
        console.error('Chess worker error:', e.data.error);
        setThinking(false);
        clearInterval(dotsTimer.current);
        return;
      }
      applyMove(e.data.move, fen);
    };

    worker.onerror = (err) => {
      console.error('Chess worker crashed:', err);
      worker.terminate();
      workerRef.current = null;
      setThinking(false);
      clearInterval(dotsTimer.current);
    };

    worker.postMessage({ fen, maxDepth: diff.maxDepth, timeLimit: diff.timeLimit });
  }, [difficulty, applyMove]);

  const startGame = () => {
    const ng = new Chess();
    setGame(ng); setLastMove(null); setResult(null);
    setCapByWhite([]); setCapByBlack([]);
    setThinking(false); setScreen('game');
    if (playerColor === 'black') setTimeout(() => makeAIMove(ng), 500);
  };

  const onDrop = useCallback((from, to) => {
    if (thinking) return false;
    const isMyTurn = (game.turn()==='w') === (playerColor==='white');
    if (!isMyTurn) return false;
    try {
      const ng = new Chess(game.fen());
      const move = ng.move({ from, to, promotion:'q' });
      if (!move) return false;
      setLastMove({ from, to });
      updateCaptures(ng);
      setGame(ng);
      if (!checkOver(ng)) setTimeout(() => makeAIMove(ng), 150);
      return true;
    } catch { return false; }
  }, [game, thinking, playerColor, makeAIMove, updateCaptures, checkOver]);

  const resign = () => {
    setResult({ winner: playerColor==='white'?'black':'white', reason:'resignation' });
    setScreen('result');
  };

  // Derived
  const history = game.history({ verbose:true });
  const movePairs = [];
  for (let i=0;i<history.length;i+=2)
    movePairs.push({ num:Math.floor(i/2)+1, w:history[i]?.san||'', b:history[i+1]?.san||'' });

  const diff = DIFFICULTIES.find(d=>d.id===difficulty)||DIFFICULTIES[1];
  const isMyTurn = !thinking && (game.turn()==='w')===(playerColor==='white');

  let statusText='', statusClass=styles.statusNeutral;
  if (thinking) { statusText=`🤖 ИИ думает${'.'.repeat(thinkingDots+1)}`; statusClass=styles.statusThinking; }
  else if (game.isCheck()) { statusText='⚠️ Шах!'; statusClass=styles.statusCheck; }
  else if (isMyTurn) { statusText='🟢 Ваш ход'; statusClass=styles.statusYour; }
  else { statusText='⏳ Ход ИИ'; statusClass=styles.statusAI; }

  const aiCaptures = playerColor==='white'?capByBlack:capByWhite;
  const myCaptures = playerColor==='white'?capByWhite:capByBlack;
  const aiPieceIcons = playerColor==='white'?PIECE_ICON_W:PIECE_ICON;
  const myPieceIcons = playerColor==='white'?PIECE_ICON:PIECE_ICON_W;

  // ════════════════════════════════════════════════════════════
  return (
    <div className={styles.wrap}>

      {/* ── SETUP ─────────────────────────────────────────── */}
      {screen==='setup' && (
        <div className={styles.setup}>
          <div className={styles.setupHeader}>
            <span className={styles.setupIcon}>♟</span>
            <div>
              <h1 className={styles.setupTitle}>Шахматы vs ИИ</h1>
              <p className={styles.setupSub}>Minimax + Alpha-Beta pruning · Piece-Square Tables</p>
            </div>
          </div>

          <div className={styles.setupGrid}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Сложность ИИ</h3>
              {DIFFICULTIES.map(d=>(
                <button
                  key={d.id}
                  className={`${styles.diffBtn} ${difficulty===d.id?styles.diffBtnOn:''}`}
                  onClick={()=>setDifficulty(d.id)}
                >
                  <span className={styles.dEmoji}>{d.emoji}</span>
                  <div className={styles.dText}>
                    <span className={styles.dLabel}>{d.label}</span>
                    <span className={styles.dDesc}>{d.desc}</span>
                  </div>
                  {difficulty===d.id && <span className={styles.dCheck}>✓</span>}
                </button>
              ))}
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Ваш цвет</h3>
              <div className={styles.colorRow}>
                {[['white','♔','Белые','Первый ход'],['black','♚','Чёрные','ИИ ходит первым']].map(([v,icon,lbl,hint])=>(
                  <button
                    key={v}
                    className={`${styles.colorBtn} ${playerColor===v?styles.colorBtnOn:''}`}
                    onClick={()=>setPlayerColor(v)}
                  >
                    <span className={styles.cIcon}>{icon}</span>
                    <span className={styles.cLabel}>{lbl}</span>
                    <span className={styles.cHint}>{hint}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button className={styles.startBtn} onClick={startGame}>▶ Начать игру</button>
        </div>
      )}

      {/* ── GAME ──────────────────────────────────────────── */}
      {screen==='game' && (
        <div className={styles.gameView}>
          <div className={styles.topBar}>
            <button className={styles.btnBack} onClick={()=>{ workerRef.current?.terminate(); setThinking(false); setScreen('setup'); }}>
              ← Настройки
            </button>
            <div className={`${styles.statusBadge} ${statusClass}`}>{statusText}</div>
            <button className={styles.btnResign} onClick={resign}>⚑ Сдаться</button>
          </div>

          <div className={styles.gameLayout}>
            <div className={styles.boardCol}>
              {/* AI Player Bar */}
              <div className={`${styles.pbar} ${thinking?styles.pbarActive:''}`}>
                <div className={styles.pbarAvatar}>🤖</div>
                <div className={styles.pbarInfo}>
                  <span className={styles.pbarName}>OpenWay AI — {diff.label}</span>
                  <span className={styles.pbarColor}>{diff.emoji} {playerColor==='white'?'♚ Чёрные':'♔ Белые'}</span>
                </div>
                <div className={styles.capRow}>
                  {aiCaptures.map((p,i)=>(
                    <span key={i} className={styles.capPiece}>{aiPieceIcons[p]}</span>
                  ))}
                </div>
                {thinking && (
                  <div className={styles.thinkAnim}>
                    <span/><span/><span/>
                  </div>
                )}
              </div>

              <div ref={boardRef} className={styles.boardWrap}>
                <ChessBoard
                  position={game.fen()}
                  onPieceDrop={onDrop}
                  boardOrientation={playerColor}
                  boardWidth={boardWidth}
                  lastMove={lastMove}
                />
              </div>

              {/* My Player Bar */}
              <div className={`${styles.pbar} ${isMyTurn?styles.pbarActive:''}`}>
                <div className={styles.pbarAvatar}>👤</div>
                <div className={styles.pbarInfo}>
                  <span className={styles.pbarName}>Вы</span>
                  <span className={styles.pbarColor}>{playerColor==='white'?'♔ Белые':'♚ Чёрные'}</span>
                </div>
                <div className={styles.capRow}>
                  {myCaptures.map((p,i)=>(
                    <span key={i} className={styles.capPiece}>{myPieceIcons[p]}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className={styles.sidebar}>
              <div className={styles.historyBox}>
                <div className={styles.histTitle}>История ходов</div>
                <div className={styles.moveGrid} ref={moveListRef}>
                  <span className={styles.mHdr}>#</span>
                  <span className={styles.mHdr}>Белые</span>
                  <span className={styles.mHdr}>Чёрные</span>
                  {movePairs.flatMap(pair=>[
                    <span key={pair.num+'-n'} className={styles.mNum}>{pair.num}.</span>,
                    <span key={pair.num+'-w'} className={styles.mW}>{pair.w}</span>,
                    <span key={pair.num+'-b'} className={styles.mB}>{pair.b}</span>,
                  ])}
                </div>
              </div>

              <div className={styles.diffBadge}>
                <span className={styles.dbEmoji}>{diff.emoji}</span>
                <div>
                  <div className={styles.dbLabel}>{diff.label}</div>
                  <div className={styles.dbDesc}>{diff.desc}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RESULT ────────────────────────────────────────── */}
      {screen==='result' && result && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalEmoji}>
              {result.winner==='draw'?'🤝':result.winner===playerColor?'🏆':'😔'}
            </div>
            <h2 className={styles.modalTitle}>
              {result.winner==='draw'?'Ничья!':result.winner===playerColor?'Вы победили!':'ИИ победил!'}
            </h2>
            <p className={styles.modalReason}>
              {({checkmate:'Мат',stalemate:'Пат',repetition:'Тройное повторение',
                insufficient:'Недостаточно материала',resignation:'Сдача',draw:'Ничья'})[result.reason]||result.reason}
            </p>
            <p className={styles.modalMoves}>Сыграно ходов: {history.length}</p>
            <div className={styles.modalBtns}>
              <button className={styles.btnAgain} onClick={startGame}>↺ Снова</button>
              <button className={styles.btnSetup} onClick={()=>setScreen('setup')}>⚙ Настройки</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
