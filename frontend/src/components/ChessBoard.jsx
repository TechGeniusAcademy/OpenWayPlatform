/**
 * ChessBoard — кастомная шахматная доска без react-dnd
 * Поддерживает: клик-для-хода, подсветку легальных ходов,
 * нативный drag-and-drop через mouse events, ориентацию доски.
 */
import React, { useState, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import styles from './ChessBoard.module.css';

// ════════════════════════════════════════════
//  Фигуры в Unicode
// ════════════════════════════════════════════
const PIECE_UNICODE = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];

function pieceKey(piece) {
  return `${piece.color}${piece.type.toUpperCase()}`;
}

export default function ChessBoard({
  position,          // FEN string
  onPieceDrop,       // (from, to) => boolean
  boardOrientation = 'white',
  boardWidth = 500,
  lastMove = null,   // { from, to }
}) {
  const [selected, setSelected] = useState(null);       // выбранная клетка
  const [legalSquares, setLegalSquares] = useState([]); // возможные ходы

  // Drag state
  const [dragging, setDragging] = useState(null);       // { square, piece, x, y }
  const boardEl = useRef(null);

  const chess = new Chess(position);

  const cellSize = Math.floor(boardWidth / 8);
  const size = cellSize * 8;

  const files = boardOrientation === 'white' ? FILES : [...FILES].reverse();
  const ranks = boardOrientation === 'white' ? RANKS : [...RANKS].reverse();

  // Позиция клетки в пикселях (абсолютно от левого-верхнего угла доски)
  const squareToXY = useCallback((sq) => {
    const f = sq[0];
    const r = parseInt(sq[1], 10);
    const fi = files.indexOf(f);
    const ri = ranks.indexOf(r);
    return { x: fi * cellSize, y: ri * cellSize };
  }, [files, ranks, cellSize]);

  // Пиксельные координаты → клетка
  const xyToSquare = useCallback((x, y) => {
    const fi = Math.floor(x / cellSize);
    const ri = Math.floor(y / cellSize);
    if (fi < 0 || fi > 7 || ri < 0 || ri > 7) return null;
    return `${files[fi]}${ranks[ri]}`;
  }, [files, ranks, cellSize]);

  // ══════════════════ CLICK LOGIC ══════════════════
  const handleSquareClick = (sq) => {
    if (dragging) return; // игнорируем клик во время drag
    const piece = chess.get(sq);

    if (selected) {
      if (legalSquares.includes(sq)) {
        onPieceDrop(selected, sq);
        setSelected(null);
        setLegalSquares([]);
      } else if (piece && piece.color === chess.turn()) {
        // выбрать другую свою фигуру
        const moves = chess.moves({ square: sq, verbose: true }).map(m => m.to);
        setSelected(sq);
        setLegalSquares(moves);
      } else {
        setSelected(null);
        setLegalSquares([]);
      }
    } else {
      if (piece && piece.color === chess.turn()) {
        const moves = chess.moves({ square: sq, verbose: true }).map(m => m.to);
        setSelected(sq);
        setLegalSquares(moves);
      }
    }
  };

  // ══════════════════ DRAG LOGIC ══════════════════
  const getBoardRect = () => boardEl.current?.getBoundingClientRect();

  const startDrag = (e, sq) => {
    const piece = chess.get(sq);
    if (!piece || piece.color !== chess.turn()) return;
    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    setDragging({ square: sq, piece, x: clientX, y: clientY });
    setSelected(sq);
    const moves = chess.moves({ square: sq, verbose: true }).map(m => m.to);
    setLegalSquares(moves);
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragging(d => ({ ...d, x: clientX, y: clientY }));
  };

  const onMouseUp = (e) => {
    if (!dragging) return;
    const rect = getBoardRect();
    if (!rect) { setDragging(null); return; }

    const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;

    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    const target = xyToSquare(relX, relY);

    if (target && legalSquares.includes(target)) {
      onPieceDrop(dragging.square, target);
    }

    setDragging(null);
    setSelected(null);
    setLegalSquares([]);
  };

  // ══════════════════ RENDER ══════════════════
  return (
    <div
      ref={boardEl}
      className={styles.board}
      style={{ width: size, height: size, position: 'relative', userSelect: 'none' }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onTouchMove={onMouseMove}
      onTouchEnd={onMouseUp}
    >
      {ranks.map((rank, ri) =>
        files.map((file, fi) => {
          const sq = `${file}${rank}`;
          const piece = chess.get(sq);
          const isLight = (FILES.indexOf(file) + rank) % 2 === 1;
          const isSelected = selected === sq;
          const isLegal = legalSquares.includes(sq);
          const isLastFrom = lastMove?.from === sq;
          const isLastTo = lastMove?.to === sq;
          const isDraggingFrom = dragging?.square === sq;

          let bg;
          if (isSelected || isLastTo)   bg = isLight ? '#f6f669' : '#baca2b';
          else if (isLastFrom)           bg = isLight ? '#cdd26a' : '#aaa23a';
          else                           bg = isLight ? '#d4e9f7' : '#4a7c9e';

          const pieceStr = piece && !isDraggingFrom ? PIECE_UNICODE[pieceKey(piece)] : null;
          const isWhitePiece = piece?.color === 'w';

          return (
            <div
              key={sq}
              className={styles.square}
              style={{
                position: 'absolute',
                left: fi * cellSize,
                top: ri * cellSize,
                width: cellSize,
                height: cellSize,
                backgroundColor: bg,
                cursor: piece?.color === chess.turn() ? 'grab' : isLegal ? 'pointer' : 'default',
              }}
              onClick={() => handleSquareClick(sq)}
              onMouseDown={(e) => startDrag(e, sq)}
              onTouchStart={(e) => startDrag(e, sq)}
            >
              {/* Точка — легальный пустой ход */}
              {isLegal && !piece && (
                <div className={styles.legalDot} style={{ width: cellSize * 0.3, height: cellSize * 0.3 }} />
              )}
              {/* Кольцо — легальное взятие */}
              {isLegal && piece && (
                <div className={styles.legalCapture} />
              )}
              {/* Фигура */}
              {pieceStr && (
                <span
                  className={`${styles.piece} ${isWhitePiece ? styles.pieceWhite : styles.pieceBlack}`}
                  style={{ fontSize: cellSize * 0.72 }}
                >
                  {pieceStr}
                </span>
              )}
              {/* Координаты */}
              {fi === 0 && (
                <span className={styles.coordRank} style={{ color: isLight ? '#4a7c9e' : '#d4e9f7', fontSize: cellSize * 0.2 }}>
                  {rank}
                </span>
              )}
              {ri === 7 && (
                <span className={styles.coordFile} style={{ color: isLight ? '#4a7c9e' : '#d4e9f7', fontSize: cellSize * 0.2 }}>
                  {file}
                </span>
              )}
            </div>
          );
        })
      )}

      {/* Ghost piece при drag */}
      {dragging && (() => {
        const rect = getBoardRect();
        if (!rect) return null;
        const pieceStr = PIECE_UNICODE[pieceKey(dragging.piece)];
        const isWhitePiece = dragging.piece.color === 'w';
        return (
          <span
            className={`${styles.ghostPiece} ${isWhitePiece ? styles.pieceWhite : styles.pieceBlack}`}
            style={{
              position: 'fixed',
              left: dragging.x - cellSize / 2,
              top: dragging.y - cellSize / 2,
              width: cellSize,
              height: cellSize,
              fontSize: cellSize * 0.72,
              pointerEvents: 'none',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {pieceStr}
          </span>
        );
      })()}
    </div>
  );
}
