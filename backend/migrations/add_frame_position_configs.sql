-- Добавляем поле position_configs для хранения настроек позиции рамки по контекстам
ALTER TABLE shop_items
ADD COLUMN IF NOT EXISTS position_configs JSONB DEFAULT '{
  "profile":      {"inset": 6, "offsetX": 0, "offsetY": 0},
  "home":         {"inset": 6, "offsetX": 0, "offsetY": 0},
  "group_leader": {"inset": 6, "offsetX": 0, "offsetY": 0},
  "group_list":   {"inset": 5, "offsetX": 0, "offsetY": 0},
  "group_modal":  {"inset": 8, "offsetX": 0, "offsetY": 0},
  "chess":        {"inset": 5, "offsetX": 0, "offsetY": 0}
}';

COMMENT ON COLUMN shop_items.position_configs IS
  'Настройки позиции рамки по контекстам отображения (profile, home, group_leader, group_list, group_modal, chess). Каждый контекст содержит inset (px), offsetX (px), offsetY (px).';
