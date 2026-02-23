/**
 * Утилиты для позиционирования рамок аватаров
 *
 * Контексты:
 *   profile      — страница профиля студента
 *   home         — главная страница (StudentHome)
 *   group_leader — карточка лидера в группе
 *   group_list   — строка списка студентов в группе
 *   group_modal  — модальное окно студента в группе
 *   chess        — шахматы (аватары игроков)
 */

/** Дефолтные настройки для каждого контекста */
export const DEFAULT_FRAME_CONFIGS = {
  profile:      { inset: 6,  offsetX: 0, offsetY: 0 },
  home:         { inset: 6,  offsetX: 0, offsetY: 0 },
  group_leader: { inset: 6,  offsetX: 0, offsetY: 0 },
  group_list:   { inset: 5,  offsetX: 0, offsetY: 0 },
  group_modal:  { inset: 8,  offsetX: 0, offsetY: 0 },
  chess:        { inset: 5,  offsetX: 0, offsetY: 0 },
};

/**
 * Возвращает inline-стиль для img рамки в нужном контексте.
 *
 * @param {object|null} item   — объект предмета магазина (с полем position_configs)
 * @param {string}      context — ключ контекста из DEFAULT_FRAME_CONFIGS
 * @returns {React.CSSProperties}
 */
export function getFrameStyle(item, context) {
  const defaults = DEFAULT_FRAME_CONFIGS[context] ?? DEFAULT_FRAME_CONFIGS.profile;
  const stored = item?.position_configs?.[context] ?? {};
  const cfg = { ...defaults, ...stored };

  const { inset, offsetX, offsetY } = cfg;

  return {
    position: 'absolute',
    top:       `${-inset + offsetY}px`,
    left:      `${-inset + offsetX}px`,
    width:     `calc(100% + ${inset * 2}px)`,
    height:    `calc(100% + ${inset * 2}px)`,
    transform: 'none',
    pointerEvents: 'none',
    objectFit: 'contain',
    zIndex: 2,
  };
}
