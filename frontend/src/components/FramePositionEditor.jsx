import { FaUser } from 'react-icons/fa';
import { AiOutlineUndo } from 'react-icons/ai';
import { DEFAULT_FRAME_CONFIGS } from '../utils/frameUtils';
import styles from './FramePositionEditor.module.css';

/**
 * Визуальный редактор позиции рамки аватара.
 * Отображает превью в 6 контекстах и позволяет настроить inset / offsetX / offsetY для каждого.
 *
 * Props:
 *   imagePreview  — data-url или обычный url изображения рамки
 *   configs       — объект с текущими настройками { profile: {...}, home: {...}, ... }
 *   onChange      — (newConfigs) => void
 */

const CONTEXTS = [
  { key: 'profile',      label: 'Профиль',        avatarSize: 100, description: 'Страница профиля' },
  { key: 'home',         label: 'Главная',          avatarSize: 100, description: 'Дашборд / главная' },
  { key: 'group_leader', label: 'Лидер группы',    avatarSize: 64,  description: 'Карточка лидера' },
  { key: 'group_list',   label: 'Список группы',   avatarSize: 40,  description: 'Строки студентов' },
  { key: 'group_modal',  label: 'Модал группы',    avatarSize: 72,  description: 'Всплывающее окно' },
  { key: 'chess',        label: 'Шахматы',          avatarSize: 50,  description: 'Аватары в шахматах' },
];

export default function FramePositionEditor({ imagePreview, configs, onChange }) {
  const getCfg = (key) => ({
    ...DEFAULT_FRAME_CONFIGS[key],
    ...(configs?.[key] || {}),
  });

  const update = (ctxKey, field, rawValue) => {
    const value = Number(rawValue);
    onChange({
      ...configs,
      [ctxKey]: { ...getCfg(ctxKey), [field]: value },
    });
  };

  const reset = (ctxKey) => {
    const next = { ...configs };
    delete next[ctxKey];
    onChange(next);
  };

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>🎯</span>
        <span className={styles.headerTitle}>Позиция рамки по страницам</span>
        <span className={styles.headerHint}>
          Перетаскивайте ползунки — рамка обновляется в реальном времени
        </span>
      </div>

      <div className={styles.grid}>
        {CONTEXTS.map(({ key, label, avatarSize, description }) => {
          const cfg = getCfg(key);
          const { inset, offsetX, offsetY } = cfg;
          const frameSize = avatarSize + inset * 2;
          const padding = 24; // padding inside preview box

          return (
            <div key={key} className={styles.card}>
              {/* Header */}
              <div className={styles.cardHead}>
                <span className={styles.cardLabel}>{label}</span>
                <button
                  type="button"
                  className={styles.resetBtn}
                  onClick={() => reset(key)}
                  title="Сбросить к умолчанию"
                >
                  <AiOutlineUndo />
                </button>
              </div>
              <div className={styles.cardDesc}>{description}</div>

              {/* Preview */}
              <div
                className={styles.preview}
                style={{ width: avatarSize + padding * 2, height: avatarSize + padding * 2 }}
              >
                {/* Avatar circle */}
                <div
                  className={styles.avatar}
                  style={{
                    width: avatarSize,
                    height: avatarSize,
                    fontSize: Math.round(avatarSize * 0.38),
                  }}
                >
                  <FaUser />
                </div>

                {/* Frame overlay */}
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="frame"
                    className={styles.frameImg}
                    style={{
                      width:  frameSize,
                      height: frameSize,
                      top:  `calc(50% - ${frameSize / 2 - offsetY}px)`,
                      left: `calc(50% - ${frameSize / 2 - offsetX}px)`,
                    }}
                  />
                ) : (
                  <div className={styles.framePlaceholder}
                    style={{
                      width:  frameSize,
                      height: frameSize,
                      top:  `calc(50% - ${frameSize / 2 - offsetY}px)`,
                      left: `calc(50% - ${frameSize / 2 - offsetX}px)`,
                    }}
                  />
                )}
              </div>

              {/* Sliders */}
              <div className={styles.sliders}>
                <SliderRow
                  label="Отступ"
                  unit="px"
                  value={inset}
                  min={0} max={30}
                  onChange={(v) => update(key, 'inset', v)}
                />
                <SliderRow
                  label="Смещ. X"
                  unit="px"
                  value={offsetX}
                  min={-20} max={20}
                  onChange={(v) => update(key, 'offsetX', v)}
                />
                <SliderRow
                  label="Смещ. Y"
                  unit="px"
                  value={offsetY}
                  min={-20} max={20}
                  onChange={(v) => update(key, 'offsetY', v)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SliderRow({ label, unit, value, min, max, onChange }) {
  return (
    <label className={styles.sliderRow}>
      <div className={styles.sliderMeta}>
        <span className={styles.sliderLabel}>{label}</span>
        <span className={styles.sliderValue}>{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        className={styles.slider}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
