import { useState, useEffect, useRef } from 'react';
import { useMusic } from '../../context/MusicContext';
import { BASE_URL } from '../../utils/api';
import api from '../../utils/api';
import styles from './StudentMusic.module.css';
import { FaPlay, FaPause, FaHeart, FaSearch, FaMusic, FaClock, FaHeadphones, FaAlignLeft, FaTimes } from 'react-icons/fa';

function StudentMusic() {
  const [tracks, setTracks] = useState([]);
  const [filteredTracks, setFilteredTracks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'liked'
  const [likedTracks, setLikedTracks] = useState([]);
  const [lyricsModal, setLyricsModal] = useState(null); // трек для показа текста
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const lyricsContentRef = useRef(null);
  
  const { currentTrack, isPlaying, playTrack, currentTime } = useMusic();

  useEffect(() => {
    loadTracks();
    loadLikedTracks();
  }, []);

  useEffect(() => {
    filterTracks();
  }, [searchQuery, tracks, activeTab, likedTracks]);

  const loadTracks = async () => {
    try {
      const response = await api.get('/music/user/library');
      setTracks(response.data.tracks);
    } catch (error) {
      console.error('Ошибка загрузки треков:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLikedTracks = async () => {
    try {
      const response = await api.get('/music/user/liked');
      setLikedTracks(response.data.tracks);
    } catch (error) {
      console.error('Ошибка загрузки лайкнутых треков:', error);
    }
  };

  const filterTracks = () => {
    let filtered = activeTab === 'liked' ? likedTracks : tracks;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(track => 
        track.title.toLowerCase().includes(query) ||
        (track.artist && track.artist.toLowerCase().includes(query))
      );
    }
    
    setFilteredTracks(filtered);
  };

  const handleLike = async (e, trackId) => {
    e.stopPropagation();
    
    try {
      const response = await api.post(`/music/${trackId}/like`);
      const { isLiked, likesCount } = response.data;
      
      // Обновляем состояние треков
      setTracks(prev => prev.map(t => 
        t.id === trackId ? { ...t, is_liked: isLiked, likes_count: likesCount } : t
      ));
      
      // Обновляем лайкнутые треки
      if (isLiked) {
        const track = tracks.find(t => t.id === trackId);
        if (track) {
          setLikedTracks(prev => [{ ...track, is_liked: true, likes_count: likesCount }, ...prev]);
        }
      } else {
        setLikedTracks(prev => prev.filter(t => t.id !== trackId));
      }
    } catch (error) {
      console.error('Ошибка лайка:', error);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayTrack = (track) => {
    const tracksToPlay = activeTab === 'liked' ? likedTracks : tracks;
    playTrack(track, tracksToPlay);
  };

  const openLyrics = (e, track) => {
    e.stopPropagation();
    setLyricsModal(track);
  };

  const closeLyrics = () => {
    setLyricsModal(null);
    setCurrentLyricIndex(-1);
  };

  // Парсинг текста с таймкодами: [MM:SS]текст или просто текст
  const parseLyrics = (lyricsText) => {
    if (!lyricsText) return [];
    
    const lines = lyricsText.split('\n');
    const parsed = [];
    
    for (const line of lines) {
      // Ищем таймкод в формате [MM:SS] или [M:SS]
      const match = line.match(/^\[(\d{1,2}):(\d{2})\](.*)$/);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const time = minutes * 60 + seconds;
        const text = match[3].trim();
        parsed.push({ time, text, hasTimecode: true });
      } else {
        // Строка без таймкода
        parsed.push({ time: null, text: line, hasTimecode: false });
      }
    }
    
    return parsed;
  };

  // Определяем текущую строку по времени воспроизведения
  useEffect(() => {
    if (!lyricsModal || !currentTrack || currentTrack.id !== lyricsModal.id) {
      return;
    }
    
    const parsedLyrics = parseLyrics(lyricsModal.lyrics);
    const lyricsWithTime = parsedLyrics.filter(l => l.hasTimecode);
    
    if (lyricsWithTime.length === 0) return;
    
    // Находим текущую строку
    let newIndex = -1;
    for (let i = lyricsWithTime.length - 1; i >= 0; i--) {
      if (currentTime >= lyricsWithTime[i].time) {
        // Находим индекс в оригинальном массиве
        newIndex = parsedLyrics.findIndex(l => l === lyricsWithTime[i]);
        break;
      }
    }
    
    if (newIndex !== currentLyricIndex) {
      setCurrentLyricIndex(newIndex);
      
      // Автоскролл к текущей строке
      if (newIndex >= 0 && lyricsContentRef.current) {
        const lyricElements = lyricsContentRef.current.querySelectorAll('[data-lyric-index]');
        if (lyricElements[newIndex]) {
          lyricElements[newIndex].scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }
    }
  }, [currentTime, lyricsModal, currentTrack]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <FaMusic className={styles.loadingIcon} />
        <p>Загрузка музыки...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerIcon}>
            <FaHeadphones />
          </div>
          <div className={styles.headerText}>
            <h1>Музыка</h1>
            <p>Слушай и наслаждайся</p>
          </div>
        </div>
        
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{tracks.length}</span>
            <span className={styles.statLabel}>Треков</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{likedTracks.length}</span>
            <span className={styles.statLabel}>Избранных</span>
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <FaMusic /> Все треки
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'liked' ? styles.active : ''}`}
            onClick={() => setActiveTab('liked')}
          >
            <FaHeart /> Избранное
          </button>
        </div>

        <div className={styles.searchWrapper}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Поиск по названию или исполнителю..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {filteredTracks.length === 0 ? (
        <div className={styles.empty}>
          <FaMusic className={styles.emptyIcon} />
          <h3>{activeTab === 'liked' ? 'Нет избранных треков' : 'Треки не найдены'}</h3>
          <p>{activeTab === 'liked' ? 'Нажмите на сердечко, чтобы добавить трек в избранное' : 'Попробуйте изменить поисковый запрос'}</p>
        </div>
      ) : (
        <div className={styles.trackList}>
          {filteredTracks.map((track, index) => {
            const isCurrentTrack = currentTrack?.id === track.id;
            const coverUrl = track.cover_url 
              ? (track.cover_url.startsWith('http') ? track.cover_url : `${BASE_URL}${track.cover_url}`)
              : null;
            
            return (
              <div 
                key={track.id} 
                className={`${styles.trackItem} ${isCurrentTrack ? styles.playing : ''}`}
                onClick={() => handlePlayTrack(track)}
              >
                <div className={styles.trackIndex}>
                  {isCurrentTrack && isPlaying ? (
                    <div className={styles.playingAnimation}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  ) : (
                    <span className={styles.indexNumber}>{index + 1}</span>
                  )}
                </div>
                
                <div className={styles.trackCover}>
                  {coverUrl ? (
                    <img src={coverUrl} alt={track.title} />
                  ) : (
                    <div className={styles.noCover}>
                      <FaMusic />
                    </div>
                  )}
                  <div className={styles.playOverlay}>
                    {isCurrentTrack && isPlaying ? <FaPause /> : <FaPlay />}
                  </div>
                </div>
                
                <div className={styles.trackInfo}>
                  <div className={styles.trackTitle}>{track.title}</div>
                  <div className={styles.trackArtist}>{track.artist || 'Неизвестный исполнитель'}</div>
                </div>
                
                <div className={styles.trackDuration}>
                  <FaClock className={styles.durationIcon} />
                  {formatDuration(track.duration)}
                </div>
                
                {track.lyrics && (
                  <button 
                    className={styles.lyricsBtn}
                    onClick={(e) => openLyrics(e, track)}
                    title="Показать текст"
                  >
                    <FaAlignLeft />
                  </button>
                )}
                
                <button 
                  className={`${styles.likeBtn} ${track.is_liked ? styles.liked : ''}`}
                  onClick={(e) => handleLike(e, track.id)}
                >
                  <FaHeart />
                  {track.likes_count > 0 && (
                    <span className={styles.likeCount}>{track.likes_count}</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Модальное окно с текстом песни */}
      {lyricsModal && (
        <div className={styles.lyricsOverlay} onClick={closeLyrics}>
          <div className={styles.lyricsModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.lyricsHeader}>
              <div className={styles.lyricsTrackInfo}>
                {lyricsModal.cover_url ? (
                  <img 
                    src={lyricsModal.cover_url.startsWith('http') ? lyricsModal.cover_url : `${BASE_URL}${lyricsModal.cover_url}`} 
                    alt={lyricsModal.title}
                    className={styles.lyricsCover}
                  />
                ) : (
                  <div className={styles.lyricsNoCover}>
                    <FaMusic />
                  </div>
                )}
                <div>
                  <h2 className={styles.lyricsTitle}>{lyricsModal.title}</h2>
                  <p className={styles.lyricsArtist}>{lyricsModal.artist || 'Неизвестный исполнитель'}</p>
                </div>
              </div>
              <button className={styles.lyricsCloseBtn} onClick={closeLyrics}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.lyricsContent} ref={lyricsContentRef}>
              {parseLyrics(lyricsModal.lyrics).map((lyric, index) => {
                const isCurrentLine = currentTrack?.id === lyricsModal.id && index === currentLyricIndex;
                const isPastLine = currentTrack?.id === lyricsModal.id && lyric.hasTimecode && index < currentLyricIndex;
                
                return (
                  <p 
                    key={index} 
                    data-lyric-index={index}
                    className={`${styles.lyricsLine} ${isCurrentLine ? styles.currentLyric : ''} ${isPastLine ? styles.pastLyric : ''} ${lyric.hasTimecode ? styles.timedLyric : ''}`}
                  >
                    {lyric.text || <br />}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentMusic;
