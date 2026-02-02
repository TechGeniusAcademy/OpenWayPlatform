import { useMusic } from '../context/MusicContext';
import { BASE_URL } from '../utils/api';
import styles from './MiniPlayer.module.css';
import { FaPlay, FaPause, FaStepForward, FaStepBackward, FaTimes, FaVolumeUp, FaVolumeMute, FaChevronDown, FaChevronUp, FaMusic } from 'react-icons/fa';

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

  if (isMinimized) {
    return (
      <div className={styles.miniPlayerMinimized}>
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
    <div className={styles.miniPlayer}>
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
