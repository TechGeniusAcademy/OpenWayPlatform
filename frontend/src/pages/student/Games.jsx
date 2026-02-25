import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import ChessGame from "../../components/ChessGame";
import OnlineChess from "../../components/OnlineChess";
import QuizBattle from "../../components/QuizBattle";
import FlexChan from "../../components/FlexChan";
import LayoutGame from "../../components/LayoutGame";
import JSGame from "../../components/JSGame";
import OpenCity from "../../components/OpenCity";
import styles from "./Games.module.css";
import { MdOutlineQuiz } from "react-icons/md";
import {
  FaChess, FaCode, FaJs, FaTrophy, FaStar, FaFire,
  FaHistory, FaCheckCircle, FaTimesCircle, FaMedal,
} from "react-icons/fa";
import { IoGameController, IoStatsChartOutline } from "react-icons/io5";
import { BsLightningChargeFill, BsGrid3X3Gap } from "react-icons/bs";
import { HiOutlineArrowLeft } from "react-icons/hi";

/* ── badge helper ── */
function StatPill({ icon, label, value, accent }) {
  return (
    <div className={styles.pill} style={accent ? { "--pill-accent": accent } : {}}>
      <span className={styles.pillIcon}>{icon}</span>
      <span className={styles.pillVal}>{value}</span>
      <span className={styles.pillLbl}>{label}</span>
    </div>
  );
}

const GAMES = [
  {
    id: "open-city", title: "OpenCity",
    icon: <IoGameController />, color: "#22d3ee",
    tag: "3D Мир", new: true,
    desc: "Исследуй бесконечный 3D город — свободное передвижение, живой мир и постоянно растущее содержимое"
  },
  {
    id: "quiz-battle", title: "Битва Знаний",
    icon: <MdOutlineQuiz />, color: "#6366f1",
    tag: "PvP", new: false,
    desc: "Соревнуйся с другими учениками в реальном времени — кто быстрее и точнее?"
  },
  {
    id: "online-chess", title: "Онлайн Шахматы",
    icon: <FaChess />, color: "#0ea5e9",
    tag: "PvP", new: false,
    desc: "Шахматы против живого соперника из твоей группы прямо сейчас"
  },
  {
    id: "chess", title: "Шахматы vs AI",
    icon: <FaChess />, color: "#8b5cf6",
    tag: "Solo",
    desc: "Классические шахматы против компьютера — выбирай уровень сложности"
  },
  {
    id: "js-game", title: "JavaScript",
    icon: <FaJs />, color: "#eab308",
    tag: "Обучение",
    desc: "Решай задачи на JS! Пиши функции, проходи тесты — зарабатывай баллы"
  },
  {
    id: "layout-game", title: "Вёрстка",
    icon: <FaCode />, color: "#10b981",
    tag: "Обучение",
    desc: "Сверстай макет в точности как образец — система проверяет каждый пиксель"
  },
  {
    id: "flex-chan", title: "Flex Chan",
    icon: <BsGrid3X3Gap />, color: "#f59e0b",
    tag: "Обучение",
    desc: "Изучай CSS Flexbox в игровой форме — помоги персонажам занять нужные позиции"
  },
];

export default function Games() {
  const { user } = useAuth();
  const [selectedGame, setSelectedGame] = useState(null);
  const [stats, setStats]               = useState(null);
  const [history, setHistory]           = useState([]);
  const [activeTab, setActiveTab]       = useState("games"); // games | stats | history

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const [pts, jsS, lyS, chH, qbH] = await Promise.allSettled([
        api.get("/points/my"),
        api.get("/js-game/stats"),
        api.get("/layout-game/stats"),
        api.get("/chess/history"),
        api.get("/quiz-battle/all-battles"),
      ]);
      setStats({
        points:    pts.status       === "fulfilled" ? pts.value.data.points       : 0,
        jsLevels:  jsS.status       === "fulfilled" ? jsS.value.data.completed_levels ?? jsS.value.data.completedLevels ?? 0 : 0,
        lyLevels:  lyS.status       === "fulfilled" ? lyS.value.data.completed_levels ?? lyS.value.data.completedLevels ?? 0 : 0,
        chessGames: chH.status      === "fulfilled" ? (chH.value.data.games || []).length : 0,
        chessWins:  chH.status      === "fulfilled" ? (chH.value.data.games || []).filter(g => g.winner_id === user?.id).length : 0,
        quizBattles: qbH.status     === "fulfilled" ? (qbH.value.data.battles || []).length : 0,
        quizWins:    qbH.status     === "fulfilled" ? (qbH.value.data.battles || []).filter(b => b.winner_id === user?.id).length : 0,
      });

      // Build unified history from chess + quiz
      const rows = [];
      if (chH.status === "fulfilled") {
        (chH.value.data.games || []).slice(0, 10).forEach(g => {
          const won = g.winner_id === user?.id;
          rows.push({
            key:    `chess-${g.id}`,
            game:   "Шахматы",
            icon:   <FaChess />,
            color:  "#0ea5e9",
            result: won ? "Победа" : g.winner_id ? "Поражение" : "Ничья",
            won,
            date:   g.ended_at || g.created_at,
          });
        });
      }
      if (qbH.status === "fulfilled") {
        (qbH.value.data.battles || []).slice(0, 10).forEach(b => {
          const won = b.winner_id === user?.id;
          rows.push({
            key:    `quiz-${b.id}`,
            game:   "Битва Знаний",
            icon:   <MdOutlineQuiz />,
            color:  "#6366f1",
            result: won ? "Победа" : b.winner_id ? "Поражение" : "Ничья",
            won,
            date:   b.finished_at || b.created_at,
          });
        });
      }
      rows.sort((a, b) => new Date(b.date) - new Date(a.date));
      setHistory(rows.slice(0, 15));
    } catch (err) {
      console.error("Games loadStats:", err);
    }
  };

  /* ── OpenCity — full-screen, has its own back button ── */
  if (selectedGame === "open-city") {
    return <OpenCity onBack={() => setSelectedGame(null)} />;
  }

  /* ── render selected game ── */
  if (selectedGame) {
    const game = GAMES.find(g => g.id === selectedGame);
    return (
      <div className={styles.page}>
        <button className={styles.backBtn} onClick={() => setSelectedGame(null)}>
          <HiOutlineArrowLeft /> Назад к играм
        </button>
        {selectedGame === "quiz-battle"  && <QuizBattle />}
        {selectedGame === "online-chess" && <OnlineChess />}
        {selectedGame === "chess"        && <ChessGame />}
        {selectedGame === "flex-chan"     && <FlexChan />}
        {selectedGame === "layout-game"  && <LayoutGame onBack={() => setSelectedGame(null)} />}
        {selectedGame === "js-game"      && <JSGame onBack={() => setSelectedGame(null)} />}
        {selectedGame === "open-city"     && <OpenCity onBack={() => setSelectedGame(null)} />}
      </div>
    );
  }

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderIcon}><IoGameController /></div>
        <div>
          <h1 className={styles.pageTitle}>Игровая комната</h1>
          <p className={styles.pageSub}>Отдохни, поучись и соревнуйся с другими студентами</p>
        </div>
      </div>

      {/* ── Stat pills ── */}
      {stats && (
        <div className={styles.pillRow}>
          <StatPill icon={<FaStar />}   label="Баллов"          value={stats.points}       accent="#f59e0b" />
          <StatPill icon={<FaJs />}     label="JS уровней"      value={stats.jsLevels}     accent="#eab308" />
          <StatPill icon={<FaCode />}   label="Вёрстка"         value={stats.lyLevels}     accent="#10b981" />
          <StatPill icon={<FaChess />}  label="Шахм. побед"     value={`${stats.chessWins}/${stats.chessGames}`}  accent="#0ea5e9" />
          <StatPill icon={<MdOutlineQuiz />} label="Квиз побед" value={`${stats.quizWins}/${stats.quizBattles}`} accent="#6366f1" />
        </div>
      )}

      {/* ── Tabs ── */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "games"   ? styles.tabActive : ""}`} onClick={() => setActiveTab("games")}>
          <IoGameController /> Игры
        </button>
        <button className={`${styles.tab} ${activeTab === "stats"   ? styles.tabActive : ""}`} onClick={() => setActiveTab("stats")}>
          <IoStatsChartOutline /> Статистика
        </button>
        <button className={`${styles.tab} ${activeTab === "history" ? styles.tabActive : ""}`} onClick={() => setActiveTab("history")}>
          <FaHistory /> История
        </button>
      </div>

      {/* ══ GAMES tab ══ */}
      {activeTab === "games" && (
        <div className={styles.grid}>
          {GAMES.map(game => (
            <div
              key={game.id}
              className={styles.card}
              style={{ "--card-accent": game.color }}
              onClick={() => setSelectedGame(game.id)}
            >
              {game.new && <span className={styles.newBadge}>В разработке...</span>}
              <div className={styles.cardTag} style={{ background: game.color + "22", color: game.color }}>
                {game.tag}
              </div>
              <div className={styles.cardIcon} style={{ background: game.color + "18", color: game.color }}>
                {game.icon}
              </div>
              <h3 className={styles.cardTitle}>{game.title}</h3>
              <p className={styles.cardDesc}>{game.desc}</p>
              <button className={styles.playBtn} style={{ background: game.color }}>
                <BsLightningChargeFill /> Играть
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ══ STATS tab ══ */}
      {activeTab === "stats" && (
        <div className={styles.statsPage}>
          {!stats ? (
            <div className={styles.center}><div className={styles.spinner} /></div>
          ) : (
            <>
              <div className={styles.statsGrid}>
                <div className={styles.statBlock}>
                  <div className={styles.statBlockIcon} style={{ background: "#f59e0b18", color: "#f59e0b" }}><FaStar /></div>
                  <div className={styles.statBlockVal}>{stats.points}</div>
                  <div className={styles.statBlockLbl}>Всего баллов</div>
                </div>
                <div className={styles.statBlock}>
                  <div className={styles.statBlockIcon} style={{ background: "#eab30818", color: "#eab308" }}><FaJs /></div>
                  <div className={styles.statBlockVal}>{stats.jsLevels}</div>
                  <div className={styles.statBlockLbl}>JS уровней пройдено</div>
                </div>
                <div className={styles.statBlock}>
                  <div className={styles.statBlockIcon} style={{ background: "#10b98118", color: "#10b981" }}><FaCode /></div>
                  <div className={styles.statBlockVal}>{stats.lyLevels}</div>
                  <div className={styles.statBlockLbl}>Уровней вёрстки</div>
                </div>
                <div className={styles.statBlock}>
                  <div className={styles.statBlockIcon} style={{ background: "#0ea5e918", color: "#0ea5e9" }}><FaChess /></div>
                  <div className={styles.statBlockVal}>{stats.chessGames}</div>
                  <div className={styles.statBlockLbl}>Шахматных партий</div>
                </div>
                <div className={styles.statBlock}>
                  <div className={styles.statBlockIcon} style={{ background: "#0ea5e918", color: "#0ea5e9" }}><FaTrophy /></div>
                  <div className={styles.statBlockVal}>{stats.chessWins}</div>
                  <div className={styles.statBlockLbl}>Побед в шахматах</div>
                </div>
                <div className={styles.statBlock}>
                  <div className={styles.statBlockIcon} style={{ background: "#6366f118", color: "#6366f1" }}><MdOutlineQuiz /></div>
                  <div className={styles.statBlockVal}>{stats.quizBattles}</div>
                  <div className={styles.statBlockLbl}>Квиз-батлов</div>
                </div>
                <div className={styles.statBlock}>
                  <div className={styles.statBlockIcon} style={{ background: "#6366f118", color: "#6366f1" }}><FaMedal /></div>
                  <div className={styles.statBlockVal}>{stats.quizWins}</div>
                  <div className={styles.statBlockLbl}>Побед в квизах</div>
                </div>
                <div className={styles.statBlock}>
                  <div className={styles.statBlockIcon} style={{ background: "#ef444418", color: "#ef4444" }}><FaFire /></div>
                  <div className={styles.statBlockVal}>
                    {stats.quizBattles > 0 ? Math.round((stats.quizWins / stats.quizBattles) * 100) : 0}%
                  </div>
                  <div className={styles.statBlockLbl}>Винрейт квизов</div>
                </div>
              </div>

              {/* Win rate bar - chess */}
              {stats.chessGames > 0 && (
                <div className={styles.rateCard}>
                  <div className={styles.rateHeader}>
                    <span><FaChess /> Шахматы — винрейт</span>
                    <strong>{Math.round((stats.chessWins / stats.chessGames) * 100)}%</strong>
                  </div>
                  <div className={styles.rateBar}>
                    <div
                      className={styles.rateFill}
                      style={{ width: `${Math.round((stats.chessWins / stats.chessGames) * 100)}%`, background: "#0ea5e9" }}
                    />
                  </div>
                  <div className={styles.rateLabels}>
                    <span className={styles.win}><FaCheckCircle /> {stats.chessWins} побед</span>
                    <span className={styles.loss}><FaTimesCircle /> {stats.chessGames - stats.chessWins} поражений</span>
                  </div>
                </div>
              )}

              {/* Win rate bar - quiz */}
              {stats.quizBattles > 0 && (
                <div className={styles.rateCard}>
                  <div className={styles.rateHeader}>
                    <span><MdOutlineQuiz /> Квиз-батл — винрейт</span>
                    <strong>{Math.round((stats.quizWins / stats.quizBattles) * 100)}%</strong>
                  </div>
                  <div className={styles.rateBar}>
                    <div
                      className={styles.rateFill}
                      style={{ width: `${Math.round((stats.quizWins / stats.quizBattles) * 100)}%`, background: "#6366f1" }}
                    />
                  </div>
                  <div className={styles.rateLabels}>
                    <span className={styles.win}><FaCheckCircle /> {stats.quizWins} побед</span>
                    <span className={styles.loss}><FaTimesCircle /> {stats.quizBattles - stats.quizWins} поражений</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ HISTORY tab ══ */}
      {activeTab === "history" && (
        <div className={styles.historyPage}>
          {history.length === 0 ? (
            <div className={styles.center}>
              <FaHistory style={{ fontSize: "2.5rem", opacity: 0.2 }} />
              <p>История игр пуста — сыграй первую партию!</p>
            </div>
          ) : (
            <div className={styles.historyList}>
              {history.map(row => (
                <div key={row.key} className={`${styles.historyRow} ${row.won ? styles.historyWon : row.result === "Ничья" ? styles.historyDraw : styles.historyLoss}`}>
                  <div className={styles.historyGameIcon} style={{ background: row.color + "18", color: row.color }}>
                    {row.icon}
                  </div>
                  <div className={styles.historyInfo}>
                    <span className={styles.historyGame}>{row.game}</span>
                    <span className={styles.historyDate}>
                      {row.date ? new Date(row.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                  </div>
                  <div className={`${styles.historyResult} ${row.won ? styles.resultWon : row.result === "Ничья" ? styles.resultDraw : styles.resultLoss}`}>
                    {row.won ? <FaCheckCircle /> : row.result === "Ничья" ? <FaMedal /> : <FaTimesCircle />}
                    {row.result}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
