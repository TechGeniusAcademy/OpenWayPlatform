import { useState, useEffect } from "react";
import { BASE_URL } from "../../utils/api";
import api from "../../utils/api";
import styles from "./StudentMovies.module.css";
import {
  FaPlay, FaSearch, FaFilm, FaTimes, FaCalendarAlt,
  FaClock, FaExpand, FaCompress, FaTv, FaChevronRight,
} from "react-icons/fa";
import { MdMovie, MdVideoLibrary, MdLocalMovies } from "react-icons/md";
import { IoFilmOutline } from "react-icons/io5";
import { BsCameraReelsFill } from "react-icons/bs";
import { HiOutlineViewGrid } from "react-icons/hi";

export default function StudentMovies() {
  const [movies, setMovies]               = useState([]);
  const [filteredMovies, setFiltered]     = useState([]);
  const [searchQuery, setSearch]          = useState("");
  const [loading, setLoading]             = useState(true);
  const [selectedGenre, setGenre]         = useState("all");
  const [selectedType, setType]           = useState("all");
  const [watchingMovie, setWatchingMovie] = useState(null);
  const [isFullscreen, setFullscreen]     = useState(false);

  const [showSeriesModal, setShowSeriesModal]     = useState(false);
  const [selectedSeries, setSelectedSeries]       = useState(null);
  const [episodes, setEpisodes]                   = useState([]);
  const [loadingEpisodes, setLoadingEps]          = useState(false);
  const [watchingEpisode, setWatchingEpisode]     = useState(null);

  const genres = ["all", ...new Set(movies.filter(m => m.genre).map(m => m.genre))];

  useEffect(() => { loadMovies(); }, []);
  useEffect(() => { filterMovies(); }, [searchQuery, movies, selectedGenre, selectedType]);

  const loadMovies = async () => {
    try {
      const r = await api.get("/movies/library");
      setMovies(r.data.movies || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filterMovies = () => {
    let f = movies;
    if (selectedType !== "all") f = f.filter(m => (m.content_type || "movie") === selectedType);
    if (selectedGenre !== "all") f = f.filter(m => m.genre === selectedGenre);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      f = f.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
      );
    }
    setFiltered(f);
  };

  const formatDuration = (min) => {
    if (!min) return null;
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? `${h}ч ${m}м` : `${m}м`;
  };

  const getEmbedUrl = (url) => {
    if (!url) return null;
    if (url.includes("/embed/") || url.includes("iframe")) return url;
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    return url;
  };

  const getVideoUrl = (movie) =>
    movie.video_file ? `${BASE_URL}${movie.video_file}` : getEmbedUrl(movie.video_url);
  const getEpisodeVideoUrl = (ep) =>
    ep.video_file ? `${BASE_URL}${ep.video_file}` : getEmbedUrl(ep.video_url);
  const isLocal = (item) => !!item.video_file;
  const coverSrc = (url) =>
    !url ? null : url.startsWith("http") ? url : `${BASE_URL}${url}`;

  const openMovie = (movie) => {
    if (movie.content_type === "series") openSeriesModal(movie);
    else { setWatchingMovie(movie); setFullscreen(false); }
  };
  const closeMovie = () => { setWatchingMovie(null); setWatchingEpisode(null); setFullscreen(false); };
  const toggleFullscreen = () => setFullscreen(f => !f);

  const openSeriesModal = async (series) => {
    setSelectedSeries(series);
    setShowSeriesModal(true);
    setLoadingEps(true);
    try {
      const r = await api.get(`/movies/${series.id}/episodes`);
      setEpisodes(r.data.episodes || []);
    } catch (e) { console.error(e); } finally { setLoadingEps(false); }
  };
  const closeSeriesModal = () => { setShowSeriesModal(false); setSelectedSeries(null); setEpisodes([]); };
  const playEpisode = (ep) => { setWatchingEpisode(ep); setShowSeriesModal(false); setFullscreen(false); };
  const closeEpisode = () => { setWatchingEpisode(null); setShowSeriesModal(true); };

  const groupBySeason = () => {
    const g = {};
    episodes.forEach(ep => {
      const s = ep.season || 1;
      if (!g[s]) g[s] = [];
      g[s].push(ep);
    });
    return g;
  };

  const moviesCount  = movies.filter(m => (m.content_type || "movie") === "movie").length;
  const seriesCount  = movies.filter(m => m.content_type === "series").length;
  const genreCount   = genres.length - 1;

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.loadWrap}>
        <div className={styles.spinner} />
        <span>Загрузка кинотеатра…</span>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderIcon}><BsCameraReelsFill /></div>
        <div>
          <h1 className={styles.pageTitle}>Кинотеатр</h1>
          <p className={styles.pageSub}>Смотри фильмы и сериалы в своё удовольствие</p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><MdLocalMovies /></div>
          <div><div className={styles.statVal}>{moviesCount}</div><div className={styles.statLbl}>Фильмов</div></div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#ede9fe", color: "#7c3aed" }}><FaTv /></div>
          <div><div className={styles.statVal}>{seriesCount}</div><div className={styles.statLbl}>Сериалов</div></div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#fef3c7", color: "#d97706" }}><HiOutlineViewGrid /></div>
          <div><div className={styles.statVal}>{genreCount}</div><div className={styles.statLbl}>Жанров</div></div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#d1fae5", color: "#059669" }}><IoFilmOutline /></div>
          <div><div className={styles.statVal}>{movies.length}</div><div className={styles.statLbl}>Всего</div></div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className={styles.controls}>
        <div className={styles.tabs}>
          {[["all","Все"], ["movie","Фильмы"], ["series","Сериалы"]].map(([v, label]) => (
            <button
              key={v}
              className={`${styles.tab} ${selectedType === v ? styles.tabActive : ""}`}
              onClick={() => setType(v)}
            >
              {v === "movie" ? <MdMovie /> : v === "series" ? <FaTv /> : null}
              {label}
            </button>
          ))}
        </div>

        <div className={styles.genreWrap}>
          {genres.map(g => (
            <button
              key={g}
              className={`${styles.genreBtn} ${selectedGenre === g ? styles.genreBtnActive : ""}`}
              onClick={() => setGenre(g)}
            >
              {g === "all" ? "Все жанры" : g}
            </button>
          ))}
        </div>

        <div className={styles.searchWrap}>
          <FaSearch className={styles.searchIco} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Поиск по названию…"
            value={searchQuery}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Grid ── */}
      {filteredMovies.length === 0 ? (
        <div className={styles.empty}>
          <FaFilm /><p>Ничего не найдено</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredMovies.map(movie => {
            const cover = coverSrc(movie.cover_url);
            const isSeries = movie.content_type === "series";
            return (
              <div key={movie.id} className={styles.card} onClick={() => openMovie(movie)}>
                <div className={styles.poster}>
                  {cover
                    ? <img src={cover} alt={movie.title} className={styles.posterImg} />
                    : <div className={styles.noPoster}>{isSeries ? <FaTv /> : <FaFilm />}</div>
                  }
                  <div className={styles.cardOverlay}>
                    <div className={styles.playCircle}>
                      {isSeries ? <FaTv /> : <FaPlay />}
                    </div>
                  </div>
                  {isSeries && (
                    <span className={styles.seriesBadge}><FaTv /> Сериал</span>
                  )}
                  {movie.duration && !isSeries && (
                    <span className={styles.durationBadge}><FaClock /> {formatDuration(movie.duration)}</span>
                  )}
                </div>
                <div className={styles.cardInfo}>
                  <h3 className={styles.cardTitle}>{movie.title}</h3>
                  <div className={styles.cardMeta}>
                    {movie.year && <span>{movie.year}</span>}
                    {movie.genre && <span className={styles.genreTag}>{movie.genre}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════ PLAYER MODAL (movie or episode) ════ */}
      {(watchingMovie || watchingEpisode) && (() => {
        const isEp = !!watchingEpisode;
        const item = isEp ? watchingEpisode : watchingMovie;
        const videoUrl = isEp ? getEpisodeVideoUrl(item) : getVideoUrl(item);
        const local = isLocal(item);
        const title = isEp ? selectedSeries?.title : watchingMovie?.title;
        const onClose = isEp ? closeEpisode : closeMovie;
        return (
          <div className={`${styles.playerOverlay} ${isFullscreen ? styles.fullscreen : ""}`} onClick={onClose}>
            <div className={styles.playerModal} onClick={e => e.stopPropagation()}>
              <div className={styles.playerHeader}>
                <div className={styles.playerMeta}>
                  <h2 className={styles.playerTitle}>{title}</h2>
                  <div className={styles.playerTags}>
                    {isEp && (
                      <span className={styles.seasonTag}>S{item.season}E{item.episode}</span>
                    )}
                    {isEp && item.title && <span className={styles.tagItem}>{item.title}</span>}
                    {!isEp && watchingMovie?.year && (
                      <span className={styles.tagItem}><FaCalendarAlt /> {watchingMovie.year}</span>
                    )}
                    {!isEp && watchingMovie?.genre && (
                      <span className={styles.tagItem}><FaFilm /> {watchingMovie.genre}</span>
                    )}
                    {item.duration && (
                      <span className={styles.tagItem}><FaClock /> {formatDuration(item.duration)}</span>
                    )}
                  </div>
                </div>
                <div className={styles.playerBtns}>
                  <button className={styles.playerBtn} onClick={toggleFullscreen}>
                    {isFullscreen ? <FaCompress /> : <FaExpand />}
                  </button>
                  <button className={`${styles.playerBtn} ${styles.playerClose}`} onClick={onClose}>
                    <FaTimes />
                  </button>
                </div>
              </div>

              <div className={styles.videoWrap}>
                {local
                  ? <video src={videoUrl} controls autoPlay className={styles.videoEl} />
                  : <iframe src={videoUrl} title={title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen className={styles.videoEl} />
                }
              </div>

              {item.description && !isFullscreen && (
                <div className={styles.playerDesc}><p>{item.description}</p></div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ════ SERIES MODAL ════ */}
      {showSeriesModal && selectedSeries && (
        <div className={styles.seriesOverlay} onClick={closeSeriesModal}>
          <div className={styles.seriesModal} onClick={e => e.stopPropagation()}>

            <div className={styles.seriesHeader}>
              {coverSrc(selectedSeries.cover_url) && (
                <img src={coverSrc(selectedSeries.cover_url)} alt={selectedSeries.title} className={styles.seriesCover} />
              )}
              <div className={styles.seriesInfo}>
                <span className={styles.seriesBadgeModal}><FaTv /> Сериал</span>
                <h2 className={styles.seriesTitle}>{selectedSeries.title}</h2>
                <div className={styles.seriesTags}>
                  {selectedSeries.year && <span><FaCalendarAlt /> {selectedSeries.year}</span>}
                  {selectedSeries.genre && <span><FaFilm /> {selectedSeries.genre}</span>}
                  <span>{episodes.length} {episodes.length === 1 ? "серия" : episodes.length < 5 ? "серии" : "серий"}</span>
                </div>
                {selectedSeries.description && (
                  <p className={styles.seriesDesc}>{selectedSeries.description}</p>
                )}
              </div>
              <button className={styles.seriesClose} onClick={closeSeriesModal}><FaTimes /></button>
            </div>

            <div className={styles.episodesWrap}>
              {loadingEpisodes ? (
                <div className={styles.loadWrap}><div className={styles.spinner} /><span>Загрузка серий…</span></div>
              ) : episodes.length === 0 ? (
                <div className={styles.empty}><FaTv /><p>Серии ещё не добавлены</p></div>
              ) : (
                Object.entries(groupBySeason()).map(([season, eps]) => (
                  <div key={season} className={styles.seasonBlock}>
                    <div className={styles.seasonTitle}><span>Сезон {season}</span></div>
                    {eps.map(ep => (
                      <div key={ep.id} className={styles.epCard} onClick={() => playEpisode(ep)}>
                        <div className={styles.epNum}>{ep.episode}</div>
                        <div className={styles.epDetails}>
                          <h4 className={styles.epTitle}>{ep.title || `Эпизод ${ep.episode}`}</h4>
                          {ep.description && <p className={styles.epDesc}>{ep.description}</p>}
                          {ep.duration && (
                            <span className={styles.epDuration}><FaClock /> {formatDuration(ep.duration)}</span>
                          )}
                        </div>
                        <div className={styles.epPlay}><FaPlay /></div>
                      </div>
                    ))}
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
