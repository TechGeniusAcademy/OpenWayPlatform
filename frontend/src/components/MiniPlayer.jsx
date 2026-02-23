import { useState, useEffect, useRef, useCallback } from "react";
import { useMusic } from "../context/MusicContext";
import { BASE_URL } from "../utils/api";
import styles from "./MiniPlayer.module.css";
import {
  FaPlay, FaPause, FaStepForward, FaStepBackward,
  FaTimes, FaVolumeUp, FaVolumeMute, FaVolumeMute as FaVolumeOff,
  FaChevronDown, FaChevronUp, FaMusic, FaRandom, FaRedoAlt,
} from "react-icons/fa";
import { MdQueueMusic } from "react-icons/md";
import { IoRemoveOutline } from "react-icons/io5";

export default function MiniPlayer() {
  const {
    currentTrack, playlist, isPlaying, currentTime, duration,
    volume, isMuted, isMinimized, showPlayer,
    togglePlay, playNext, playPrevious, seekTo, setVolumeLevel,
    toggleMute, setIsMinimized, closePlayer, playTrack,
  } = useMusic();

  /* ── Local state ── */
  const [isShuffle, setShuffle] = useState(false);
  const [repeat, setRepeat]     = useState("none"); // none | one | all
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX]     = useState(0);
  const [showVolume, setShowVol] = useState(false);
  const [position, setPosition] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);

  const dragRef   = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const progressRef = useRef(null);

  /* ── Drag ── */
  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging) return;
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
      const pw = isMinimized ? 180 : 480;
      const ph = isMinimized ? 56  : 120;
      setPosition({
        x: clamp(e.clientX - offsetRef.current.x, 0, window.innerWidth  - pw),
        y: clamp(e.clientY - offsetRef.current.y, 0, window.innerHeight - ph),
      });
    };
    const onUp = () => setIsDragging(false);
    if (isDragging) {
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup",  onUp);
    }
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",  onUp);
    };
  }, [isDragging, isMinimized]);

  const startDrag = useCallback((e) => {
    if (!dragRef.current) return;
    const rect = dragRef.current.getBoundingClientRect();
    offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (position.x === null) setPosition({ x: rect.left, y: rect.top });
    setIsDragging(true);
  }, [position]);

  /* ── Repeat one ── */
  useEffect(() => {
    if (repeat === "one" && duration > 0 && currentTime >= duration - 0.4) {
      seekTo(0);
    }
  }, [currentTime, duration, repeat]);

  /* ── Helpers ── */
  const fmt = (t) => {
    if (!t || isNaN(t)) return "0:00";
    return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  };

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo(((e.clientX - rect.left) / rect.width) * duration);
  };

  const handleProgressHover = (e) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = (e.clientX - rect.left) / rect.width;
    setHoverTime(pct * duration);
    setHoverX(e.clientX - rect.left);
  };

  const handleNextClick = () => {
    if (isShuffle && playlist.length > 1) {
      const others = playlist.filter(t => t.id !== currentTrack?.id);
      const rand   = others[Math.floor(Math.random() * others.length)];
      if (rand) playTrack(rand, playlist);
    } else {
      playNext();
    }
  };

  const cycleRepeat = () => {
    setRepeat(r => r === "none" ? "one" : r === "one" ? "all" : "none");
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const coverUrl = currentTrack?.cover_url
    ? (currentTrack.cover_url.startsWith("http") ? currentTrack.cover_url : `${BASE_URL}${currentTrack.cover_url}`)
    : null;
  const pos = position.x !== null ? { left: position.x, top: position.y, right: "auto", bottom: "auto" } : {};

  if (!showPlayer || !currentTrack) return null;

  /* ════ MINIMIZED PILL ════ */
  if (isMinimized) {
    return (
      <div
        ref={dragRef}
        className={`${styles.pill} ${isDragging ? styles.dragging : ""}`}
        style={pos}
      >
        <div className={styles.pillDrag} onMouseDown={startDrag} title="Перетащить" />

        <div className={`${styles.pillCover} ${isPlaying ? styles.spinning : ""}`}>
          {coverUrl
            ? <img src={coverUrl} alt={currentTrack.title} />
            : <div className={styles.pillCoverFb}><FaMusic /></div>
          }
        </div>

        <div className={styles.pillInfo}>
          <span className={styles.pillTitle}>{currentTrack.title}</span>
          {isPlaying && (
            <div className={styles.pillBars}>
              <span /><span /><span /><span />
            </div>
          )}
        </div>

        <div className={styles.pillControls}>
          <button className={styles.pillBtn} onClick={playPrevious}><FaStepBackward /></button>
          <button className={`${styles.pillBtn} ${styles.pillPlay}`} onClick={togglePlay}>
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>
          <button className={styles.pillBtn} onClick={handleNextClick}><FaStepForward /></button>
        </div>

        <button className={styles.pillExpand} onClick={() => setIsMinimized(false)} title="Развернуть">
          <FaChevronUp />
        </button>
        <button className={styles.pillClose} onClick={closePlayer} title="Закрыть">
          <FaTimes />
        </button>
      </div>
    );
  }

  /* ════ FULL PLAYER ════ */
  return (
    <div
      ref={dragRef}
      className={`${styles.player} ${isDragging ? styles.dragging : ""}`}
      style={pos}
    >
      {/* Drag handle */}
      <div className={styles.dragHandle} onMouseDown={startDrag} title="Перетащить">
        <span /><span /><span />
      </div>

      {/* Progress bar */}
      <div
        ref={progressRef}
        className={styles.progress}
        onClick={handleProgressClick}
        onMouseMove={handleProgressHover}
        onMouseLeave={() => setHoverTime(null)}
      >
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          <div className={styles.progressThumb} style={{ left: `${progress}%` }} />
        </div>
        {hoverTime !== null && (
          <div className={styles.progressTooltip} style={{ left: hoverX }}>
            {fmt(hoverTime)}
          </div>
        )}
      </div>

      {/* Times */}
      <div className={styles.times}>
        <span>{fmt(currentTime)}</span>
        <span>{fmt(duration)}</span>
      </div>

      {/* Main content */}
      <div className={styles.content}>

        {/* Cover */}
        <div className={`${styles.cover} ${isPlaying ? styles.spinning : ""}`}>
          {coverUrl
            ? <img src={coverUrl} alt={currentTrack.title} />
            : <div className={styles.coverFb}><FaMusic /></div>
          }
        </div>

        {/* Track info */}
        <div className={styles.info}>
          <div className={styles.titleWrap}>
            <span className={`${styles.trackTitle} ${currentTrack.title.length > 22 ? styles.marquee : ""}`}>
              {currentTrack.title}
            </span>
          </div>
          <span className={styles.trackArtist}>{currentTrack.artist || "Неизвестный исполнитель"}</span>
          {playlist.length > 1 && (
            <span className={styles.trackQueue}>
              <MdQueueMusic />
              {playlist.findIndex(t => t.id === currentTrack.id) + 1} / {playlist.length}
            </span>
          )}
        </div>

        {/* Playback controls */}
        <div className={styles.controls}>
          <button className={styles.ctrlBtn} onClick={playPrevious} title="Предыдущий"><FaStepBackward /></button>
          <button className={styles.playBtn} onClick={togglePlay}>
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>
          <button className={styles.ctrlBtn} onClick={handleNextClick} title="Следующий"><FaStepForward /></button>
        </div>

        {/* Right controls */}
        <div className={styles.rightControls}>

          <button
            className={`${styles.iconBtn} ${isShuffle ? styles.iconBtnActive : ""}`}
            onClick={() => setShuffle(s => !s)}
            title="Перемешать"
          >
            <FaRandom />
          </button>

          <button
            className={`${styles.iconBtn} ${repeat !== "none" ? styles.iconBtnActive : ""}`}
            onClick={cycleRepeat}
            title={repeat === "none" ? "Повтор выкл" : repeat === "one" ? "Повтор 1" : "Повтор всех"}
          >
            <FaRedoAlt />
            {repeat === "one" && <span className={styles.repeatBadge}>1</span>}
          </button>

          <div className={styles.volWrap}
            onMouseEnter={() => setShowVol(true)}
            onMouseLeave={() => setShowVol(false)}
          >
            <button className={styles.iconBtn} onClick={toggleMute}>
              {isMuted || volume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>
            <div className={`${styles.volSliderWrap} ${showVolume ? styles.volSliderVisible : ""}`}>
              <input
                type="range" min="0" max="1" step="0.01"
                value={isMuted ? 0 : volume}
                onChange={e => setVolumeLevel(parseFloat(e.target.value))}
                className={styles.volSlider}
              />
            </div>
          </div>

          <button className={styles.iconBtn} onClick={() => setIsMinimized(true)} title="Свернуть">
            <IoRemoveOutline style={{ fontSize: "1.1rem" }} />
          </button>

          <button className={`${styles.iconBtn} ${styles.closeBtn}`} onClick={closePlayer} title="Закрыть">
            <FaTimes />
          </button>
        </div>
      </div>
    </div>
  );
}
