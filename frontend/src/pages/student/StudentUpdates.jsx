import { useState, useEffect, useMemo } from "react";
import api from "../../utils/api";
import styles from "./StudentUpdates.module.css";
import { IoMegaphoneOutline } from "react-icons/io5";
import { MdNewReleases, MdOutlineCalendarToday } from "react-icons/md";
import { HiOutlineDocumentText, HiOutlineSparkles } from "react-icons/hi";
import { BsLightningChargeFill, BsCalendar3 } from "react-icons/bs";
import { FiSearch } from "react-icons/fi";

function StudentUpdates() {
  const [updates, setUpdates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/updates");
        const sorted = (res.data.updates || []).sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        setUpdates(sorted);
        if (sorted.length > 0) setSelected(sorted[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fmt = (d) =>
    new Date(d).toLocaleDateString("ru-RU", {
      day: "numeric", month: "long", year: "numeric",
    });

  const fmtShort = (d) =>
    new Date(d).toLocaleDateString("ru-RU", {
      day: "numeric", month: "short",
    });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return updates;
    return updates.filter(
      (u) =>
        u.title?.toLowerCase().includes(q) ||
        u.version?.toLowerCase().includes(q) ||
        u.description?.toLowerCase().includes(q)
    );
  }, [updates, search]);

  // Stats
  const thisYearCount = updates.filter(
    (u) => new Date(u.created_at).getFullYear() === new Date().getFullYear()
  ).length;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.spinnerWrap}>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.iconTile}>
            <IoMegaphoneOutline />
          </div>
          <div>
            <h1 className={styles.pageTitle}>Обновления платформы</h1>
            <p className={styles.pageSub}>История изменений и новых возможностей OpenWay</p>
          </div>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.hStat}>
            <HiOutlineDocumentText />
            <span>{updates.length} версий</span>
          </div>
          <div className={styles.hStat}>
            <BsCalendar3 />
            <span>{thisYearCount} в этом году</span>
          </div>
          {updates.length > 0 && (
            <div className={`${styles.hStat} ${styles.hStatAccent}`}>
              <BsLightningChargeFill />
              <span>{updates[0].version}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Layout ── */}
      {updates.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIco}><IoMegaphoneOutline /></div>
          <p className={styles.emptyTitle}>Нет опубликованных обновлений</p>
          <p className={styles.emptySub}>Следите за новостями платформы</p>
        </div>
      ) : (
        <div className={styles.layout}>

          {/* ── Left sidebar ── */}
          <aside className={styles.nav}>
            <div className={styles.navSearch}>
              <FiSearch className={styles.navSearchIco} />
              <input
                className={styles.navSearchInput}
                placeholder="Поиск..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
              />
            </div>

            <div className={styles.navList}>
              {filtered.length === 0 && (
                <p className={styles.navEmpty}>Ничего не найдено</p>
              )}
              {filtered.map((upd, i) => {
                const isLatest = upd.id === updates[0]?.id;
                const isActive = selected?.id === upd.id;
                return (
                  <button
                    key={upd.id}
                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                    onClick={() => setSelected(upd)}
                  >
                    <div className={styles.navItemLeft}>
                      <span className={`${styles.navVer} ${isLatest ? styles.navVerLatest : ""}`}>
                        {upd.version}
                      </span>
                      {isLatest && <span className={styles.navNewBadge}>new</span>}
                    </div>
                    <div className={styles.navItemMeta}>
                      <span className={styles.navTitle}>{upd.title}</span>
                      <span className={styles.navDate}>
                        <MdOutlineCalendarToday />
                        {fmtShort(upd.created_at)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ── Right content ── */}
          <main className={styles.content}>
            {!selected ? (
              <div className={styles.empty}>
                <p className={styles.emptySub}>Выберите версию слева</p>
              </div>
            ) : (
              <div className={styles.release} key={selected.id}>
                {/* Release header */}
                <div className={styles.releaseHead}>
                  <div className={styles.releaseTopRow}>
                    <span className={styles.releaseVersion}>
                      <BsLightningChargeFill />
                      {selected.version}
                    </span>
                    {selected.id === updates[0]?.id && (
                      <span className={styles.releaseLatestTag}>
                        <HiOutlineSparkles />
                        Последнее обновление
                      </span>
                    )}
                  </div>
                  <h2 className={styles.releaseTitle}>{selected.title}</h2>
                  <div className={styles.releaseMeta}>
                    <span className={styles.releaseDate}>
                      <MdOutlineCalendarToday />
                      {fmt(selected.created_at)}
                    </span>
                    {selected.updated_at !== selected.created_at && (
                      <span className={styles.releaseUpdated}>
                        изменено {fmtShort(selected.updated_at)}
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.releaseDivider} />

                {/* Description */}
                {selected.description && (
                  <p className={styles.releaseDesc}>{selected.description}</p>
                )}

                {/* HTML content */}
                {selected.content && (
                  <div
                    className={styles.releaseBody}
                    dangerouslySetInnerHTML={{ __html: selected.content }}
                  />
                )}
              </div>
            )}
          </main>

        </div>
      )}
    </div>
  );
}

export default StudentUpdates;
