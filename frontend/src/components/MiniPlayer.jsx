import { useState, useRef, useEffect } from 'react';
import { useMusic } from '../context/MusicContext';
import { BASE_URL } from '../utils/api';
import styles from './MiniPlayer.module.css';
import { FaPlay, FaPause, FaStepForward, FaStepBackward, FaTimes, FaVolumeUp, FaVolumeMute, FaChevronDown, FaChevronUp, FaMusic, FaGripVertical } from 'react-icons/fa';

function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isMinimized,
    showPlayer,
    togglePlay,
    playNext,
    playPrevious,
    seekTo,
    setVolumeLevel,
    toggleMute,
    setIsMinimized,
    closePlayer
  } = useMusic();

  // Drag functionality
  const [position, setPosition] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const newX = e.clientX - offsetRef.current.x;
      const newY = e.clientY - offsetRef.current.y;
      
      // Ограничиваем в пределах экрана
      const playerWidth = isMinimized ? 120 : 400;
      const playerHeight = isMinimized ? 50 : 80;
      
      const maxX = window.innerWidth - playerWidth;
      const maxY = window.innerHeight - playerHeight;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isMinimized]);

  const handleDragStart = (e) => {
    if (dragRef.current) {
      const rect = dragRef.current.getBoundingClientRect();
      offsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      setIsDragging(true);
      
      // Если позиция ещё не установлена, установим текущую
      if (position.x === null) {
        setPosition({ x: rect.left, y: rect.top });
      }
    }
  };

  if (!showPlayer || !currentTrack) {
    return null;
  }

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seekTo(percent * duration);
  };

  const handleVolumeChange = (e) => {
    setVolumeLevel(parseFloat(e.target.value));
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  const coverUrl = currentTrack.cover_url 
    ? (currentTrack.cover_url.startsWith('http') ? currentTrack.cover_url : `${BASE_URL}${currentTrack.cover_url}`)
    : null;

  const playerStyle = position.x !== null ? {
    left: position.x,
    top: position.y,
    right: 'auto'
  } : {};

  if (isMinimized) {
    return (
      <div 
        ref={dragRef}
        className={`${styles.miniPlayerMinimized} ${isDragging ? styles.dragging : ''}`}
        style={playerStyle}
      >
        <div 
          className={styles.dragHandle} 
          onMouseDown={handleDragStart}
          title="Перетащить"
        >
          <FaGripVertical />
        </div>
        <div className={styles.minimizedCover}>
          {coverUrl ? (
            <img src={coverUrl} alt={currentTrack.title} />
          ) : (
            <div className={styles.noCover}>
              <FaMusic />
            </div>
          )}
          <div className={`${styles.playingIndicator} ${isPlaying ? styles.active : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        <button className={styles.minimizedPlayBtn} onClick={togglePlay}>
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        <button className={styles.expandBtn} onClick={() => setIsMinimized(false)}>
          <FaChevronUp />
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={dragRef}
      className={`${styles.miniPlayer} ${isDragging ? styles.dragging : ''}`}
      style={playerStyle}
    >
      <div 
        className={styles.dragHandleBar} 
        onMouseDown={handleDragStart}
        title="Перетащить"
      >
        <FaGripVertical />
      </div>
      <div className={styles.progressBar} onClick={handleProgressClick}>
        <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
      </div>
      
      <div className={styles.playerContent}>
        <div className={styles.trackInfo}>
          <div className={styles.coverWrapper}>
            {coverUrl ? (
              <img src={coverUrl} alt={currentTrack.title} className={styles.cover} />
            ) : (
              <div className={styles.noCover}>
                <FaMusic />
              </div>
            )}
          </div>
          <div className={styles.trackDetails}>
            <div className={styles.trackTitle}>{currentTrack.title}</div>
            <div className={styles.trackArtist}>{currentTrack.artist || 'Неизвестный исполнитель'}</div>
          </div>
        </div>

        <div className={styles.controls}>
          <button className={styles.controlBtn} onClick={playPrevious}>
            <FaStepBackward />
          </button>
          <button className={styles.playBtn} onClick={togglePlay}>
            {isPlaying ? <FaPause /> : <FaPlay />}
          </button>
          <button className={styles.controlBtn} onClick={playNext}>
            <FaStepForward />
          </button>
        </div>

        <div className={styles.rightControls}>
          <div className={styles.time}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
          
          <div className={styles.volumeControl}>
            <button className={styles.volumeBtn} onClick={toggleMute}>
              {isMuted || volume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className={styles.volumeSlider}
            />
          </div>

          <button className={styles.minimizeBtn} onClick={() => setIsMinimized(true)}>
            <FaChevronDown />
          </button>
          
          <button className={styles.closeBtn} onClick={closePlayer}>
            <FaTimes />
          </button>
        </div>
      </div>
    </div>
  );
}

export default MiniPlayer;
