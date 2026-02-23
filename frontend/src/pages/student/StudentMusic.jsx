import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useMusic } from "../../context/MusicContext";
import { BASE_URL } from "../../utils/api";
import api from "../../utils/api";
import styles from "./StudentMusic.module.css";
import {
  FaPlay, FaPause, FaHeart, FaSearch, FaMusic,
  FaClock, FaHeadphones, FaAlignLeft, FaTimes,
  FaGuitar,
} from "react-icons/fa";
import { IoMusicalNotesOutline } from "react-icons/io5";
import { MdOutlineLibraryMusic, MdFavoriteBorder, MdFavorite } from "react-icons/md";

export default function StudentMusic() {
  const [tracks, setTracks]           = useState([]);
  const [filteredTracks, setFiltered] = useState([]);
  const [searchQuery, setSearch]      = useState("");
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState("all");
  const [likedTracks, setLiked]       = useState([]);
  const [lyricsModal, setLyricsModal] = useState(null);
  const [currentLyricIdx, setLyricIdx] = useState(-1);
  const lyricsRef = useRef(null);

  const { currentTrack, isPlaying, playTrack, currentTime } = useMusic();

  /* ── Parse LRC ── */
  const parseLyrics = useCallback((text) => {
    if (!text) return [];
    return text.split("\n").map((raw, i) => {
      const line  = raw.replace(/\r/g, "").trim();
      const match = line.match(/^\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\](.*)$/);
      if (match) {
        const ms  = match[3] ? parseInt(match[3]) / (match[3].length === 1 ? 10 : match[3].length === 2 ? 100 : 1000) : 0;
        return { index: i, time: parseInt(match[1]) * 60 + parseInt(match[2]) + ms, text: match[4].trim(), timed: true };
      }
      return { index: i, time: null, text: line, timed: false };
    });
  }, []);

  const parsedLyrics  = useMemo(() => parseLyrics(lyricsModal?.lyrics), [lyricsModal?.lyrics, parseLyrics]);
  const timedLyrics   = useMemo(() => parsedLyrics.filter(l => l.timed && l.time != null), [parsedLyrics]);

  /* ── Load ── */
  useEffect(() => { loadTracks(); loadLiked(); }, []);
  useEffect(() => { filter(); }, [searchQuery, tracks, activeTab, likedTracks]);

  const loadTracks = async () => {
    try {
      const r = await api.get("/music/user/library");
      setTracks(r.data.tracks || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };
  const loadLiked = async () => {
    try {
      const r = await api.get("/music/user/liked");
      setLiked(r.data.tracks || []);
    } catch (e) { console.error(e); }
  };

  const filter = () => {
    let base = activeTab === "liked" ? likedTracks : tracks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      base = base.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.artist && t.artist.toLowerCase().includes(q))
      );
    }
    setFiltered(base);
  };

  /* ── Like ── */
  const handleLike = async (e, trackId) => {
    e.stopPropagation();
    try {
      const { data } = await api.post(`/music/${trackId}/like`);
      const { isLiked, likesCount } = data;
      setTracks(p => p.map(t => t.id === trackId ? { ...t, is_liked: isLiked, likes_count: likesCount } : t));
      if (isLiked) {
        const track = tracks.find(t => t.id === trackId);
        if (track) setLiked(p => [{ ...track, is_liked: true, likes_count: likesCount }, ...p.filter(t => t.id !== trackId)]);
      } else {
        setLiked(p => p.filter(t => t.id !== trackId));
      }
    } catch (e) { console.error(e); }
  };

  const fmt = (s) => {
    if (!s) return "--:--";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  const handlePlay = (track) => playTrack(track, activeTab === "liked" ? likedTracks : tracks);

  /* ── Lyrics sync ── */
  useEffect(() => {
    if (!lyricsModal || !currentTrack || currentTrack.id !== lyricsModal.id || !timedLyrics.length) {
      if (currentLyricIdx !== -1) setLyricIdx(-1);
      return;
    }
    let found = -1;
    for (let i = timedLyrics.length - 1; i >= 0; i--) {
      if (currentTime >= timedLyrics[i].time) {
        found = parsedLyrics.findIndex(l => l.index === timedLyrics[i].index);
        break;
      }
    }
    if (found !== currentLyricIdx) {
      setLyricIdx(found);
      if (found >= 0 && lyricsRef.current) {
        setTimeout(() => {
          const els = lyricsRef.current?.querySelectorAll("[data-li]");
          els?.[found]?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
      }
    }
  }, [currentTime, lyricsModal, currentTrack, parsedLyrics, timedLyrics, currentLyricIdx]);

  const coverSrc = (url) => url ? (url.startsWith("http") ? url : `${BASE_URL}${url}`) : null;

  /* ── Stats ── */
  const totalDuration = tracks.reduce((s, t) => s + (t.duration || 0), 0);
  const totalMin = Math.floor(totalDuration / 60);

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.loadWrap}><div className={styles.spinner} /><span>Загрузка музыки…</span></div>
    </div>
  );

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderIcon}><FaHeadphones /></div>
        <div>
          <h1 className={styles.pageTitle}>Музыка</h1>
          <p className={styles.pageSub}>Слушай любимые треки во время учёбы</p>
        </div>
      </div>

      {/* ── Stat tiles ── */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><MdOutlineLibraryMusic /></div>
          <div>
            <div className={styles.statVal}>{tracks.length}</div>
            <div className={styles.statLbl}>Треков в библиотеке</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#fce7f3", color: "#db2777" }}><FaHeart /></div>
          <div>
            <div className={styles.statVal}>{likedTracks.length}</div>
            <div className={styles.statLbl}>В избранном</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#d1fae5", color: "#059669" }}><FaClock /></div>
          <div>
            <div className={styles.statVal}>{totalMin} мин</div>
            <div className={styles.statLbl}>Общее время</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#fef3c7", color: "#d97706" }}><FaGuitar /></div>
          <div>
            <div className={styles.statVal}>{tracks.filter(t => t.lyrics).length}</div>
            <div className={styles.statLbl}>Треков с текстом</div>
          </div>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className={styles.controls}>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab === "all"   ? styles.tabActive : ""}`} onClick={() => setActiveTab("all")}>
            <IoMusicalNotesOutline /> Все треки
          </button>
          <button className={`${styles.tab} ${activeTab === "liked" ? styles.tabActive : ""}`} onClick={() => setActiveTab("liked")}>
            <MdFavorite /> Избранное
          </button>
        </div>
        <div className={styles.searchWrap}>
          <FaSearch className={styles.searchIco} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Поиск по названию или исполнителю…"
            value={searchQuery}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Track list ── */}
      {filteredTracks.length === 0 ? (
        <div className={styles.empty}>
          <FaMusic />
          <p>{activeTab === "liked" ? "Нет избранных треков" : "Ничего не найдено"}</p>
        </div>
      ) : (
        <div className={styles.list}>
          {/* Header row */}
          <div className={styles.listHead}>
            <span className={styles.colIdx}>#</span>
            <span />
            <span>Название</span>
            <span className={styles.colDur}><FaClock /></span>
            <span />
          </div>

          {filteredTracks.map((track, i) => {
            const isCurrent = currentTrack?.id === track.id;
            const cover     = coverSrc(track.cover_url);
            return (
              <div
                key={track.id}
                className={`${styles.row} ${isCurrent ? styles.rowActive : ""}`}
                onClick={() => handlePlay(track)}
              >
                {/* Index / animation */}
                <div className={styles.colIdx}>
                  {isCurrent && isPlaying ? (
                    <div className={styles.bars}><span /><span /><span /></div>
                  ) : (
                    <span className={styles.rowNum}>{i + 1}</span>
                  )}
                </div>

                {/* Cover */}
                <div className={styles.cover}>
                  {cover
                    ? <img src={cover} alt={track.title} />
                    : <div className={styles.coverFallback}><FaMusic /></div>
                  }
                  <div className={styles.coverOverlay}>
                    {isCurrent && isPlaying ? <FaPause /> : <FaPlay />}
                  </div>
                </div>

                {/* Info */}
                <div className={styles.info}>
                  <span className={`${styles.trackTitle} ${isCurrent ? styles.trackTitleActive : ""}`}>{track.title}</span>
                  <span className={styles.trackArtist}>{track.artist || "Неизвестный исполнитель"}</span>
                </div>

                {/* Duration */}
                <div className={styles.colDur}>{fmt(track.duration)}</div>

                {/* Actions */}
                <div className={styles.actions}>
                  {track.lyrics && (
                    <button className={styles.actionBtn} title="Текст песни" onClick={e => { e.stopPropagation(); setLyricsModal(track); }}>
                      <FaAlignLeft />
                    </button>
                  )}
                  <button
                    className={`${styles.actionBtn} ${styles.likeBtn} ${track.is_liked ? styles.liked : ""}`}
                    onClick={e => handleLike(e, track.id)}
                  >
                    {track.is_liked ? <MdFavorite /> : <MdFavoriteBorder />}
                    {track.likes_count > 0 && <span className={styles.likeCnt}>{track.likes_count}</span>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Lyrics modal ── */}
      {lyricsModal && (
        <div className={styles.overlay} onClick={() => { setLyricsModal(null); setLyricIdx(-1); }}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>

            <div className={styles.modalHeader}>
              <div className={styles.modalTrack}>
                {coverSrc(lyricsModal.cover_url)
                  ? <img src={coverSrc(lyricsModal.cover_url)} className={styles.modalCover} alt="" />
                  : <div className={styles.modalCoverFb}><FaMusic /></div>
                }
                <div>
                  <div className={styles.modalTitle}>{lyricsModal.title}</div>
                  <div className={styles.modalArtist}>{lyricsModal.artist || "Неизвестный исполнитель"}</div>
                </div>
              </div>
              <div className={styles.modalActions}>
                <button
                  className={styles.modalPlay}
                  onClick={() => handlePlay(lyricsModal)}
                >
                  {currentTrack?.id === lyricsModal.id && isPlaying ? <FaPause /> : <FaPlay />}
                </button>
                <button className={styles.modalClose} onClick={() => { setLyricsModal(null); setLyricIdx(-1); }}>
                  <FaTimes />
                </button>
              </div>
            </div>

            {currentTrack?.id === lyricsModal.id && (
              <div className={styles.syncBadge}>
                <span className={styles.syncDot} />
                Текст синхронизирован
              </div>
            )}

            <div className={styles.lyricsBody} ref={lyricsRef}>
              {parsedLyrics.map((l, idx) => (
                <p
                  key={idx}
                  data-li={idx}
                  className={[
                    styles.lyricsLine,
                    currentTrack?.id === lyricsModal.id && idx === currentLyricIdx ? styles.lyricsActive : "",
                    currentTrack?.id === lyricsModal.id && l.timed && idx < currentLyricIdx ? styles.lyricsPast : "",
                  ].join(" ")}
                >
                  {l.text || <br />}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
