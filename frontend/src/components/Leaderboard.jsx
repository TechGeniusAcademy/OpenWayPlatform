import { useState, useEffect } from "react";
import api, { BASE_URL } from "../utils/api";
import {
  FaTrophy, FaMedal, FaUsers, FaUser, FaStar,
  FaCrown, FaFire, FaGraduationCap, FaSearch,
  FaChartBar, FaBolt,
} from "react-icons/fa";
import { MdOutlineLeaderboard } from "react-icons/md";
import styles from "./Leaderboard.module.css";

/* Fallback avatar with initials */
function AvatarImg({ src, name, className }) {
  const [failed, setFailed] = useState(false);
  const initials = (name || "?")
    .split(" ").filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join("");
  const hue = [...(name || "A")].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  if (failed || !src)
    return (
      <div className={className} style={{ background: `hsl(${hue},55%,55%)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.75em", userSelect: "none" }}>
        {initials}
      </div>
    );
  return <img src={src} alt={name} className={className} onError={() => setFailed(true)} />;
}

const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
const RANK_LABELS = ["1st", "2nd", "3rd"];

const Leaderboard = () => {
  const [topStudents, setTopStudents] = useState([]);
  const [topGroups, setTopGroups]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState("students");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [sRes, gRes] = await Promise.all([
        api.get("/points/top-students?limit=50"),
        api.get("/points/top-groups?limit=20"),
      ]);
      setTopStudents(sRes.data.students);
      setTopGroups(gRes.data.groups);
    } catch (err) {
      console.error("Leaderboard load:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = topStudents.filter(s => {
    const q = searchQuery.toLowerCase();
    return (s.full_name || s.username || "").toLowerCase().includes(q)
      || (s.group_name || "").toLowerCase().includes(q);
  });

  const filteredGroups = topGroups.filter(g =>
    (g.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
        <span>Загрузка рейтингов…</span>
      </div>
    );
  }

  const topS  = filteredStudents.slice(0, 3);
  const restS = filteredStudents.slice(3);
  const topG  = filteredGroups.slice(0, 3);
  const restG = filteredGroups.slice(3);

  return (
    <div className={styles.page}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderIcon}><MdOutlineLeaderboard /></div>
        <div>
          <h1 className={styles.pageTitle}>Рейтинги и Топы</h1>
          <p className={styles.pageSub}>Лучшие студенты и группы платформы</p>
        </div>
      </div>

      {/* Stat tiles */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><FaGraduationCap /></div>
          <div>
            <div className={styles.statVal}>{topStudents.length}</div>
            <div className={styles.statLbl}>Участников</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#fef3c7", color: "#d97706" }}><FaUsers /></div>
          <div>
            <div className={styles.statVal}>{topGroups.length}</div>
            <div className={styles.statLbl}>Групп</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#fce7f3", color: "#db2777" }}><FaTrophy /></div>
          <div>
            <div className={styles.statVal}>{topStudents[0]?.points ?? "—"}</div>
            <div className={styles.statLbl}>Рекорд баллов</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: "#d1fae5", color: "#059669" }}><FaFire /></div>
          <div>
            <div className={styles.statVal}>{topGroups[0]?.total_points ?? "—"}</div>
            <div className={styles.statLbl}>Топ группа</div>
          </div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className={styles.controls}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "students" ? styles.tabActive : ""}`}
            onClick={() => { setActiveTab("students"); setSearchQuery(""); }}
          >
            <FaGraduationCap /> Студенты
          </button>
          <button
            className={`${styles.tab} ${activeTab === "groups" ? styles.tabActive : ""}`}
            onClick={() => { setActiveTab("groups"); setSearchQuery(""); }}
          >
            <FaUsers /> Группы
          </button>
        </div>
        <div className={styles.searchWrap}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={activeTab === "students" ? "Поиск по имени или группе…" : "Поиск группы…"}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ── STUDENTS ── */}
      {activeTab === "students" && (
        <>
          {/* Podium */}
          {topS.length >= 3 && (
            <div className={styles.podiumWrap}>
              {/* 2nd */}
              <div className={`${styles.podiumCard} ${styles.podiumSecond}`}>
                <AvatarImg
                  src={topS[1].avatar_url ? `${BASE_URL}${topS[1].avatar_url}` : null}
                  name={topS[1].full_name || topS[1].username}
                  className={styles.podiumAvatar}
                />
                <div className={styles.podiumMedal} style={{ color: RANK_COLORS[1] }}><FaMedal /></div>
                <div className={styles.podiumName}>{topS[1].full_name || topS[1].username}</div>
                <div className={styles.podiumPts}><FaStar />{topS[1].points}</div>
                <div className={styles.podiumBase} style={{ background: `linear-gradient(145deg,#d1d5db,#9ca3af)` }}>2</div>
              </div>

              {/* 1st */}
              <div className={`${styles.podiumCard} ${styles.podiumFirst}`}>
                <div className={styles.crownWrap}><FaCrown style={{ color: "#FFD700" }} /></div>
                <AvatarImg
                  src={topS[0].avatar_url ? `${BASE_URL}${topS[0].avatar_url}` : null}
                  name={topS[0].full_name || topS[0].username}
                  className={styles.podiumAvatar}
                />
                <div className={styles.podiumMedal} style={{ color: RANK_COLORS[0] }}><FaTrophy /></div>
                <div className={styles.podiumName}>{topS[0].full_name || topS[0].username}</div>
                <div className={styles.podiumPts}><FaStar />{topS[0].points}</div>
                <div className={styles.podiumBase} style={{ background: "linear-gradient(145deg,#FCD34D,#F59E0B)" }}>1</div>
              </div>

              {/* 3rd */}
              <div className={`${styles.podiumCard} ${styles.podiumThird}`}>
                <AvatarImg
                  src={topS[2].avatar_url ? `${BASE_URL}${topS[2].avatar_url}` : null}
                  name={topS[2].full_name || topS[2].username}
                  className={styles.podiumAvatar}
                />
                <div className={styles.podiumMedal} style={{ color: RANK_COLORS[2] }}><FaMedal /></div>
                <div className={styles.podiumName}>{topS[2].full_name || topS[2].username}</div>
                <div className={styles.podiumPts}><FaStar />{topS[2].points}</div>
                <div className={styles.podiumBase} style={{ background: "linear-gradient(145deg,#D97706,#92400E)" }}>3</div>
              </div>
            </div>
          )}

          {/* Full list */}
          <div className={styles.sectionHead}>
            <FaChartBar /> <span>Полный рейтинг</span>
            <span className={styles.countBadge}>{filteredStudents.length}</span>
          </div>

          {filteredStudents.length === 0 ? (
            <div className={styles.empty}><FaSearch /><p>Студенты не найдены</p></div>
          ) : (
            <div className={styles.list}>
              {filteredStudents.map((s, i) => (
                <div key={s.id} className={`${styles.listItem} ${i < 3 ? styles.listItemTop : ""}`}>
                  <div className={styles.rankCell}>
                    {i === 0 ? <FaTrophy style={{ color: RANK_COLORS[0], fontSize: "1.3rem" }} />
                      : i === 1 ? <FaMedal style={{ color: RANK_COLORS[1], fontSize: "1.2rem" }} />
                      : i === 2 ? <FaMedal style={{ color: RANK_COLORS[2], fontSize: "1.1rem" }} />
                      : <span className={styles.rankNum}>{i + 1}</span>}
                  </div>
                  <AvatarImg
                    src={s.avatar_url ? `${BASE_URL}${s.avatar_url}` : null}
                    name={s.full_name || s.username}
                    className={styles.listAvatar}
                  />
                  <div className={styles.listInfo}>
                    <div className={styles.listName}>
                      {s.full_name || s.username}
                      {i < 10 && <FaBolt className={styles.fireIcon} />}
                    </div>
                    <div className={styles.listSub}>
                      {s.group_name
                        ? <span className={styles.groupTag}><FaUsers />{s.group_name}</span>
                        : <span className={styles.noGroup}>Без группы</span>}
                    </div>
                  </div>
                  <div className={styles.listPoints}>
                    <span className={styles.ptsVal}>{s.points}</span>
                    <span className={styles.ptsLbl}>баллов</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── GROUPS ── */}
      {activeTab === "groups" && (
        <>
          {/* Podium for groups */}
          {topG.length >= 3 && (
            <div className={styles.podiumWrap}>
              <div className={`${styles.podiumCard} ${styles.podiumSecond}`}>
                <div className={styles.groupPodiumIcon} style={{ background: "linear-gradient(135deg,#d1d5db,#9ca3af)" }}><FaUsers /></div>
                <div className={styles.podiumMedal} style={{ color: RANK_COLORS[1] }}><FaMedal /></div>
                <div className={styles.podiumName}>{topG[1].name}</div>
                <div className={styles.podiumPts}><FaStar />{topG[1].total_points}</div>
                <div className={styles.podiumBase} style={{ background: "linear-gradient(145deg,#d1d5db,#9ca3af)" }}>2</div>
              </div>
              <div className={`${styles.podiumCard} ${styles.podiumFirst}`}>
                <div className={styles.crownWrap}><FaCrown style={{ color: "#FFD700" }} /></div>
                <div className={styles.groupPodiumIcon} style={{ background: "linear-gradient(135deg,#FCD34D,#F59E0B)" }}><FaUsers /></div>
                <div className={styles.podiumMedal} style={{ color: RANK_COLORS[0] }}><FaTrophy /></div>
                <div className={styles.podiumName}>{topG[0].name}</div>
                <div className={styles.podiumPts}><FaStar />{topG[0].total_points}</div>
                <div className={styles.podiumBase} style={{ background: "linear-gradient(145deg,#FCD34D,#F59E0B)" }}>1</div>
              </div>
              <div className={`${styles.podiumCard} ${styles.podiumThird}`}>
                <div className={styles.groupPodiumIcon} style={{ background: "linear-gradient(135deg,#D97706,#92400E)" }}><FaUsers /></div>
                <div className={styles.podiumMedal} style={{ color: RANK_COLORS[2] }}><FaMedal /></div>
                <div className={styles.podiumName}>{topG[2].name}</div>
                <div className={styles.podiumPts}><FaStar />{topG[2].total_points}</div>
                <div className={styles.podiumBase} style={{ background: "linear-gradient(145deg,#D97706,#92400E)" }}>3</div>
              </div>
            </div>
          )}

          <div className={styles.sectionHead}>
            <FaUsers /> <span>Все группы</span>
            <span className={styles.countBadge}>{filteredGroups.length}</span>
          </div>

          {filteredGroups.length === 0 ? (
            <div className={styles.empty}><FaSearch /><p>Группы не найдены</p></div>
          ) : (
            <div className={styles.list}>
              {filteredGroups.map((g, i) => (
                <div key={g.id} className={`${styles.listItem} ${i < 3 ? styles.listItemTop : ""}`}>
                  <div className={styles.rankCell}>
                    {i === 0 ? <FaTrophy style={{ color: RANK_COLORS[0], fontSize: "1.3rem" }} />
                      : i === 1 ? <FaMedal style={{ color: RANK_COLORS[1], fontSize: "1.2rem" }} />
                      : i === 2 ? <FaMedal style={{ color: RANK_COLORS[2], fontSize: "1.1rem" }} />
                      : <span className={styles.rankNum}>{i + 1}</span>}
                  </div>
                  <div className={styles.groupListIcon}><FaUsers /></div>
                  <div className={styles.listInfo}>
                    <div className={styles.listName}>
                      {g.name}
                      {i === 0 && <FaCrown className={styles.crownIcon} />}
                    </div>
                    <div className={styles.listSub}>
                      <span className={styles.groupTag}><FaGraduationCap />{g.student_count} студентов</span>
                      <span className={styles.groupTag} style={{ marginLeft: 6 }}>ср. {g.average_points} б.</span>
                    </div>
                  </div>
                  <div className={styles.listPoints}>
                    <span className={styles.ptsVal}>{g.total_points}</span>
                    <span className={styles.ptsLbl}>всего баллов</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Leaderboard;
