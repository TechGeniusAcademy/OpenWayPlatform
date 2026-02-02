import { useState, useEffect } from 'react';
import { BASE_URL } from '../../utils/api';
import api from '../../utils/api';
import styles from './StudentMovies.module.css';
import { FaPlay, FaSearch, FaFilm, FaTimes, FaCalendarAlt, FaClock, FaExpand, FaCompress } from 'react-icons/fa';
import { MdMovie, MdVideoLibrary } from 'react-icons/md';

function StudentMovies() {
  const [movies, setMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [watchingMovie, setWatchingMovie] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Получить уникальные жанры
  const genres = ['all', ...new Set(movies.filter(m => m.genre).map(m => m.genre))];

  useEffect(() => {
    loadMovies();
  }, []);

  useEffect(() => {
    filterMovies();
  }, [searchQuery, movies, selectedGenre]);

  const loadMovies = async () => {
    try {
      const response = await api.get('/movies/library');
      setMovies(response.data.movies || []);
    } catch (error) {
      console.error('Ошибка загрузки фильмов:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterMovies = () => {
    let filtered = movies;
    
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(movie => movie.genre === selectedGenre);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(movie => 
        movie.title.toLowerCase().includes(query) ||
        (movie.description && movie.description.toLowerCase().includes(query))
      );
    }
    
    setFilteredMovies(filtered);
  };

  const formatDuration = (minutes) => {
    if (!minutes) return null;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}ч ${mins}м`;
    }
    return `${mins}м`;
  };

  // Извлечение embed URL
  const getEmbedUrl = (url) => {
    if (!url) return null;
    
    if (url.includes('/embed/') || url.includes('iframe')) {
      return url;
    }
    
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    
    return url;
  };

  // Проверить, локальный ли файл
  const isLocalVideo = (movie) => {
    return !!movie.video_file;
  };

  // Получить URL видео
  const getVideoUrl = (movie) => {
    if (movie.video_file) {
      return `${BASE_URL}${movie.video_file}`;
    }
    return getEmbedUrl(movie.video_url);
  };

  const openMovie = (movie) => {
    setWatchingMovie(movie);
    setIsFullscreen(false);
  };

  const closeMovie = () => {
    setWatchingMovie(null);
    setIsFullscreen(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <MdMovie className={styles.loadingIcon} />
        <p>Загрузка фильмов...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerIcon}>
            <MdVideoLibrary />
          </div>
          <div className={styles.headerText}>
            <h1>Кинотеатр</h1>
            <p>Смотри и отдыхай</p>
          </div>
        </div>
        
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{movies.length}</span>
            <span className={styles.statLabel}>Фильмов</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{genres.length - 1}</span>
            <span className={styles.statLabel}>Жанров</span>
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.genres}>
          {genres.map(genre => (
            <button
              key={genre}
              className={`${styles.genreBtn} ${selectedGenre === genre ? styles.active : ''}`}
              onClick={() => setSelectedGenre(genre)}
            >
              {genre === 'all' ? 'Все' : genre}
            </button>
          ))}
        </div>
        
        <div className={styles.searchBox}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Поиск фильма..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {filteredMovies.length === 0 ? (
        <div className={styles.emptyState}>
          <FaFilm className={styles.emptyIcon} />
          <p>Фильмы не найдены</p>
        </div>
      ) : (
        <div className={styles.moviesGrid}>
          {filteredMovies.map(movie => (
            <div 
              key={movie.id} 
              className={styles.movieCard}
              onClick={() => openMovie(movie)}
            >
              <div className={styles.moviePoster}>
                {movie.cover_url ? (
                  <img 
                    src={`${BASE_URL}${movie.cover_url}`} 
                    alt={movie.title}
                    className={styles.posterImage}
                  />
                ) : (
                  <div className={styles.noPoster}>
                    <FaFilm />
                  </div>
                )}
                <div className={styles.playOverlay}>
                  <FaPlay className={styles.playIcon} />
                </div>
                {movie.duration && (
                  <span className={styles.duration}>
                    <FaClock /> {formatDuration(movie.duration)}
                  </span>
                )}
              </div>
              
              <div className={styles.movieInfo}>
                <h3 className={styles.movieTitle}>{movie.title}</h3>
                <div className={styles.movieMeta}>
                  {movie.year && <span>{movie.year}</span>}
                  {movie.genre && <span className={styles.genre}>{movie.genre}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модалка просмотра фильма */}
      {watchingMovie && (
        <div className={`${styles.playerOverlay} ${isFullscreen ? styles.fullscreen : ''}`} onClick={closeMovie}>
          <div className={styles.playerModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.playerHeader}>
              <div className={styles.playerInfo}>
                <h2>{watchingMovie.title}</h2>
                <div className={styles.playerMeta}>
                  {watchingMovie.year && (
                    <span><FaCalendarAlt /> {watchingMovie.year}</span>
                  )}
                  {watchingMovie.genre && (
                    <span><FaFilm /> {watchingMovie.genre}</span>
                  )}
                  {watchingMovie.duration && (
                    <span><FaClock /> {formatDuration(watchingMovie.duration)}</span>
                  )}
                </div>
              </div>
              <div className={styles.playerActions}>
                <button className={styles.fullscreenBtn} onClick={toggleFullscreen}>
                  {isFullscreen ? <FaCompress /> : <FaExpand />}
                </button>
                <button className={styles.closeBtn} onClick={closeMovie}>
                  <FaTimes />
                </button>
              </div>
            </div>
            
            <div className={styles.videoContainer}>
              {isLocalVideo(watchingMovie) ? (
                <video
                  src={getVideoUrl(watchingMovie)}
                  controls
                  autoPlay
                  className={styles.videoPlayer}
                />
              ) : (
                <iframe
                  src={getEmbedUrl(watchingMovie.video_url)}
                  title={watchingMovie.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  className={styles.videoIframe}
                />
              )}
            </div>
            
            {watchingMovie.description && !isFullscreen && (
              <div className={styles.movieDescription}>
                <p>{watchingMovie.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentMovies;
