-- Скрипт для назначения администратора в игре Kaetram
-- Создано: 2025-12-14
-- Описание: Назначение ранга Admin игроку в Kaetram

-- Показать всех игроков Kaetram с их рангами
SELECT username, rank FROM kaetram_players ORDER BY created_at DESC LIMIT 10;

-- Ранги в Kaetram:
-- 0 = None (обычный игрок)
-- 1 = Moderator (модератор)
-- 2 = Admin (администратор)
-- 3 = Veteran (ветеран)
-- 4 = Patron (патрон)
-- 5 = Artist (художник)
-- 6 = Cheater (читер)
-- 7-13 = Tier One-Seven (уровни патронов)
-- 14 = HollowAdmin (полый админ - только просмотр)
-- 15 = Booster (бустер)

-- НАЗНАЧИТЬ АДМИНИСТРАТОРА
-- Замените 'YOUR_USERNAME' на имя вашего персонажа
UPDATE kaetram_players 
SET rank = 2 
WHERE username = 'Admin';

-- Проверить изменения
SELECT username, rank, 
    CASE rank
        WHEN 0 THEN 'None'
        WHEN 1 THEN 'Moderator'
        WHEN 2 THEN 'Admin'
        WHEN 3 THEN 'Veteran'
        WHEN 14 THEN 'HollowAdmin'
        ELSE 'Other'
    END as rank_name
FROM kaetram_players 
WHERE rank > 0
ORDER BY rank DESC;
