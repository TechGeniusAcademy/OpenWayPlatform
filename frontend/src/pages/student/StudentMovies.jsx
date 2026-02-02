import { useState, useEffect } from 'react';
import { BASE_URL } from '../../utils/api';
import api from '../../utils/api';
import styles from './StudentMovies.module.css';
import { FaPlay, FaSearch, FaFilm, FaTimes, FaCalendarAlt, FaClock, FaExpand, FaCompress, FaTv, FaChevronRight } from 'react-icons/fa';
import { MdMovie, MdVideoLibrary } from 'react-icons/md';

function StudentMovies() {
  const [movies, setMovies] = useState([]);
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedType, setSelectedType] = useState('all'); // all, movie, series
  const [watchingMovie, setWatchingMovie] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Для сериалов
  const [showSeriesModal, setShowSeriesModal] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [watchingEpisode, setWatchingEpisode] = useState(null);

  // Получить уникальные жанры
  const genres = ['all', ...new Set(movies.filter(m => m.genre).map(m => m.genre))];

  useEffect(() => {
    loadMovies();
  }, []);

  useEffect(() => {
    filterMovies();
  }, [searchQuery, movies, selectedGenre, selectedType]);

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
    
    // Фильтр по типу
    if (selectedType !== 'all') {
      filtered = filtered.filter(movie => (movie.content_type || 'movie') === selectedType);
    }
    
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
    // Если это сериал - открываем модалку с сериями
    if (movie.content_type === 'series') {
      openSeriesModal(movie);
    } else {
      setWatchingMovie(movie);
      setIsFullscreen(false);
    }
  };

  const closeMovie = () => {
    setWatchingMovie(null);
    setWatchingEpisode(null);
    setIsFullscreen(false);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Функции для сериалов
  const openSeriesModal = async (series) => {
    setSelectedSeries(series);
    setShowSeriesModal(true);
    setLoadingEpisodes(true);
    
    try {
      const response = await api.get(`/movies/${series.id}/episodes`);
      setEpisodes(response.data.episodes || []);
    } catch (error) {
      console.error('Ошибка загрузки эпизодов:', error);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const closeSeriesModal = () => {
    setShowSeriesModal(false);
    setSelectedSeries(null);
    setEpisodes([]);
  };

  const playEpisode = (episode) => {
    setWatchingEpisode(episode);
    setShowSeriesModal(false);
    setIsFullscreen(false);
  };

  const closeEpisode = () => {
    setWatchingEpisode(null);
    setShowSeriesModal(true);
  };

  // Получить URL видео для эпизода
  const getEpisodeVideoUrl = (episode) => {
    if (episode.video_file) {
      return `${BASE_URL}${episode.video_file}`;
    }
    return getEmbedUrl(episode.video_url);
  };

  // Проверить, локальный ли файл эпизода
  const isLocalEpisode = (episode) => {
    return !!episode.video_file;
  };

  // Группировка эпизодов по сезонам
  const groupEpisodesBySeason = () => {
    const grouped = {};
    episodes.forEach(ep => {
      const season = ep.season || 1;
      if (!grouped[season]) {
        grouped[season] = [];
      }
      grouped[season].push(ep);
    });
    return grouped;
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
            <span className={styles.statValue}>{movies.filter(m => (m.content_type || 'movie') === 'movie').length}</span>
            <span className={styles.statLabel}>Фильмов</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{movies.filter(m => m.content_type === 'series').length}</span>
            <span className={styles.statLabel}>Сериалов</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{genres.length - 1}</span>
            <span className={styles.statLabel}>Жанров</span>
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.typeFilter}>
          <button
            className={`${styles.typeBtn} ${selectedType === 'all' ? styles.active : ''}`}
            onClick={() => setSelectedType('all')}
          >
            Все
          </button>
          <button
            className={`${styles.typeBtn} ${selectedType === 'movie' ? styles.active : ''}`}
            onClick={() => setSelectedType('movie')}
          >
            <MdMovie /> Фильмы
          </button>
          <button
            className={`${styles.typeBtn} ${selectedType === 'series' ? styles.active : ''}`}
            onClick={() => setSelectedType('series')}
          >
            <FaTv /> Сериалы
          </button>
        </div>
        
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
                    {movie.content_type === 'series' ? <FaTv /> : <FaFilm />}
                  </div>
                )}
                <div className={styles.playOverlay}>
                  {movie.content_type === 'series' ? (
                    <FaTv className={styles.playIcon} />
                  ) : (
                    <FaPlay className={styles.playIcon} />
                  )}
                </div>
                {movie.content_type === 'series' && (
                  <span className={styles.seriesBadge}>
                    <FaTv /> Сериал
                  </span>
                )}
                {movie.duration && movie.content_type !== 'series' && (
                  <span className={styles.duration}>
                    <FaClock /> {formatDuration(movie.duration)}
                  </span>
                )}
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

      {/* Модалка просмотра эпизода сериала */}
      {watchingEpisode && selectedSeries && (
        <div className={`${styles.playerOverlay} ${isFullscreen ? styles.fullscreen : ''}`} onClick={closeEpisode}>
          <div className={styles.playerModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.playerHeader}>
              <div className={styles.playerInfo}>
                <h2>{selectedSeries.title}</h2>
                <div className={styles.playerMeta}>
                  <span className={styles.episodeTag}>S{watchingEpisode.season}E{watchingEpisode.episode}</span>
                  <span>{watchingEpisode.title || `Эпизод ${watchingEpisode.episode}`}</span>
                  {watchingEpisode.duration && (
                    <span><FaClock /> {formatDuration(watchingEpisode.duration)}</span>
                  )}
                </div>
              </div>
              <div className={styles.playerActions}>
                <button className={styles.fullscreenBtn} onClick={toggleFullscreen}>
                  {isFullscreen ? <FaCompress /> : <FaExpand />}
                </button>
                <button className={styles.closeBtn} onClick={closeEpisode}>
                  <FaTimes />
                </button>
              </div>
            </div>
            
            <div className={styles.videoContainer}>
              {isLocalEpisode(watchingEpisode) ? (
                <video
                  src={getEpisodeVideoUrl(watchingEpisode)}
                  controls
                  autoPlay
                  className={styles.videoPlayer}
                />
              ) : (
                <iframe
                  src={getEmbedUrl(watchingEpisode.video_url)}
                  title={watchingEpisode.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  className={styles.videoIframe}
                />
              )}
            </div>
            
            {watchingEpisode.description && !isFullscreen && (
              <div className={styles.movieDescription}>
                <p>{watchingEpisode.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Модалка выбора серии */}
      {showSeriesModal && selectedSeries && (
        <div className={styles.seriesOverlay} onClick={closeSeriesModal}>
          <div className={styles.seriesModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.seriesHeader}>
              {selectedSeries.cover_url && (
                <img 
                  src={`${BASE_URL}${selectedSeries.cover_url}`} 
                  alt={selectedSeries.title}
                  className={styles.seriesCover}
                />
              )}
              <div className={styles.seriesInfo}>
                <div className={styles.seriesBadgeModal}>
                  <FaTv /> Сериал
                </div>
                <h2>{selectedSeries.title}</h2>
                <div className={styles.seriesMeta}>
                  {selectedSeries.year && <span><FaCalendarAlt /> {selectedSeries.year}</span>}
                  {selectedSeries.genre && <span><FaFilm /> {selectedSeries.genre}</span>}
                  <span>{episodes.length} {episodes.length === 1 ? 'серия' : episodes.length < 5 ? 'серии' : 'серий'}</span>
                </div>
                {selectedSeries.description && (
                  <p className={styles.seriesDescription}>{selectedSeries.description}</p>
                )}
              </div>
              <button className={styles.closeSeriesBtn} onClick={closeSeriesModal}>
                <FaTimes />
              </button>
            </div>
            
            <div className={styles.episodesContainer}>
              {loadingEpisodes ? (
                <div className={styles.loadingEpisodes}>
                  <FaTv className={styles.loadingIcon} />
                  <p>Загрузка серий...</p>
                </div>
              ) : episodes.length === 0 ? (
                <div className={styles.noEpisodes}>
                  <FaTv />
                  <p>Серии ещё не добавлены</p>
                </div>
              ) : (
                Object.entries(groupEpisodesBySeason()).map(([season, seasonEpisodes]) => (
                  <div key={season} className={styles.seasonBlock}>
                    <h3 className={styles.seasonTitle}>Сезон {season}</h3>
                    <div className={styles.episodesList}>
                      {seasonEpisodes.map(ep => (
                        <div 
                          key={ep.id} 
                          className={styles.episodeCard}
                          onClick={() => playEpisode(ep)}
                        >
                          <div className={styles.episodeNumber}>
                            {ep.episode}
                          </div>
                          <div className={styles.episodeDetails}>
                            <h4>{ep.title || `Эпизод ${ep.episode}`}</h4>
                            {ep.description && <p>{ep.description}</p>}
                            {ep.duration && (
                              <span className={styles.episodeDuration}>
                                <FaClock /> {formatDuration(ep.duration)}
                              </span>
                            )}
                          </div>
                          <div className={styles.playEpisodeBtn}>
                            <FaPlay />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentMovies;
