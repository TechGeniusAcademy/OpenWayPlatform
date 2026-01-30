-- Миграция для создания таблиц Kaetram в PostgreSQL
-- Создано: 2025-12-14
-- Описание: Таблицы для хранения данных игры Kaetram

-- 1. Основная таблица игроков
CREATE TABLE IF NOT EXISTS kaetram_players (
    id SERIAL PRIMARY KEY,
    username VARCHAR(32) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    x INTEGER DEFAULT 0,
    y INTEGER DEFAULT 0,
    user_agent VARCHAR(255),
    rank INTEGER DEFAULT 0,
    poison_type INTEGER DEFAULT 0,
    poison_remaining INTEGER DEFAULT 0,
    effects JSONB DEFAULT '{}',
    hit_points INTEGER DEFAULT 100,
    mana INTEGER DEFAULT 20,
    orientation INTEGER DEFAULT 0,
    ban BIGINT DEFAULT 0,
    jail BIGINT DEFAULT 0,
    mute BIGINT DEFAULT 0,
    last_warp BIGINT DEFAULT 0,
    map_version INTEGER DEFAULT 0,
    regions_loaded INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    friends TEXT[] DEFAULT ARRAY[]::TEXT[],
    last_server_id INTEGER DEFAULT -1,
    last_address VARCHAR(45),
    last_global_chat BIGINT DEFAULT 0,
    guild VARCHAR(255),
    pet VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expiration BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Связь с основной таблицей пользователей OpenWay
    openway_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_kaetram_players_username ON kaetram_players(username);
CREATE INDEX IF NOT EXISTS idx_kaetram_players_email ON kaetram_players(email);
CREATE INDEX IF NOT EXISTS idx_kaetram_players_openway_user ON kaetram_players(openway_user_id);
CREATE INDEX IF NOT EXISTS idx_kaetram_players_guild ON kaetram_players(guild);

-- 2. Таблица экипировки игрока
CREATE TABLE IF NOT EXISTS kaetram_equipment (
    id SERIAL PRIMARY KEY,
    username VARCHAR(32) UNIQUE NOT NULL REFERENCES kaetram_players(username) ON DELETE CASCADE,
    data JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kaetram_equipment_username ON kaetram_equipment(username);

-- 3. Таблица инвентаря игрока
CREATE TABLE IF NOT EXISTS kaetram_inventory (
    id SERIAL PRIMARY KEY,
    username VARCHAR(32) UNIQUE NOT NULL REFERENCES kaetram_players(username) ON DELETE CASCADE,
    data JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kaetram_inventory_username ON kaetram_inventory(username);

-- 4. Таблица банка игрока
CREATE TABLE IF NOT EXISTS kaetram_bank (
    id SERIAL PRIMARY KEY,
    username VARCHAR(32) UNIQUE NOT NULL REFERENCES kaetram_players(username) ON DELETE CASCADE,
    data JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kaetram_bank_username ON kaetram_bank(username);

-- 5. Таблица квестов игрока
CREATE TABLE IF NOT EXISTS kaetram_quests (
    id SERIAL PRIMARY KEY,
    username VARCHAR(32) UNIQUE NOT NULL REFERENCES kaetram_players(username) ON DELETE CASCADE,
    data JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kaetram_quests_username ON kaetram_quests(username);

-- 6. Таблица достижений игрока
CREATE TABLE IF NOT EXISTS kaetram_achievements (
    id SERIAL PRIMARY KEY,
    username VARCHAR(32) UNIQUE NOT NULL REFERENCES kaetram_players(username) ON DELETE CASCADE,
    data JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kaetram_achievements_username ON kaetram_achievements(username);

-- 7. Таблица навыков игрока
CREATE TABLE IF NOT EXISTS kaetram_skills (
    id SERIAL PRIMARY KEY,
    username VARCHAR(32) UNIQUE NOT NULL REFERENCES kaetram_players(username) ON DELETE CASCADE,
    data JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kaetram_skills_username ON kaetram_skills(username);

-- 8. Таблица статистики игрока
CREATE TABLE IF NOT EXISTS kaetram_statistics (
    id SERIAL PRIMARY KEY,
    username VARCHAR(32) UNIQUE NOT NULL REFERENCES kaetram_players(username) ON DELETE CASCADE,
    data JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kaetram_statistics_username ON kaetram_statistics(username);

-- 9. Таблица способностей игрока
CREATE TABLE IF NOT EXISTS kaetram_abilities (
    id SERIAL PRIMARY KEY,
    username VARCHAR(32) UNIQUE NOT NULL REFERENCES kaetram_players(username) ON DELETE CASCADE,
    data JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kaetram_abilities_username ON kaetram_abilities(username);

-- 10. Таблица гильдий
CREATE TABLE IF NOT EXISTS kaetram_guilds (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) UNIQUE NOT NULL,
    owner VARCHAR(32) NOT NULL,
    name VARCHAR(100) NOT NULL,
    creation_date BIGINT NOT NULL,
    members JSONB DEFAULT '[]',
    decorations JSONB DEFAULT '{}',
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kaetram_guilds_identifier ON kaetram_guilds(identifier);
CREATE INDEX IF NOT EXISTS idx_kaetram_guilds_owner ON kaetram_guilds(owner);
CREATE INDEX IF NOT EXISTS idx_kaetram_guilds_name ON kaetram_guilds(name);

-- 11. Таблица IP банов
CREATE TABLE IF NOT EXISTS kaetram_ipbans (
    id SERIAL PRIMARY KEY,
    ip VARCHAR(45) UNIQUE NOT NULL,
    reason TEXT,
    banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    banned_by VARCHAR(32)
);

CREATE INDEX IF NOT EXISTS idx_kaetram_ipbans_ip ON kaetram_ipbans(ip);

-- Триггеры для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_kaetram_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применяем триггеры ко всем таблицам
CREATE TRIGGER kaetram_players_updated_at BEFORE UPDATE ON kaetram_players
    FOR EACH ROW EXECUTE FUNCTION update_kaetram_updated_at();

CREATE TRIGGER kaetram_equipment_updated_at BEFORE UPDATE ON kaetram_equipment
    FOR EACH ROW EXECUTE FUNCTION update_kaetram_updated_at();

CREATE TRIGGER kaetram_inventory_updated_at BEFORE UPDATE ON kaetram_inventory
    FOR EACH ROW EXECUTE FUNCTION update_kaetram_updated_at();

CREATE TRIGGER kaetram_bank_updated_at BEFORE UPDATE ON kaetram_bank
    FOR EACH ROW EXECUTE FUNCTION update_kaetram_updated_at();

CREATE TRIGGER kaetram_quests_updated_at BEFORE UPDATE ON kaetram_quests
    FOR EACH ROW EXECUTE FUNCTION update_kaetram_updated_at();

CREATE TRIGGER kaetram_achievements_updated_at BEFORE UPDATE ON kaetram_achievements
    FOR EACH ROW EXECUTE FUNCTION update_kaetram_updated_at();

CREATE TRIGGER kaetram_skills_updated_at BEFORE UPDATE ON kaetram_skills
    FOR EACH ROW EXECUTE FUNCTION update_kaetram_updated_at();

CREATE TRIGGER kaetram_statistics_updated_at BEFORE UPDATE ON kaetram_statistics
    FOR EACH ROW EXECUTE FUNCTION update_kaetram_updated_at();

CREATE TRIGGER kaetram_abilities_updated_at BEFORE UPDATE ON kaetram_abilities
    FOR EACH ROW EXECUTE FUNCTION update_kaetram_updated_at();

CREATE TRIGGER kaetram_guilds_updated_at BEFORE UPDATE ON kaetram_guilds
    FOR EACH ROW EXECUTE FUNCTION update_kaetram_updated_at();

-- Комментарии к таблицам
COMMENT ON TABLE kaetram_players IS 'Основная таблица игроков Kaetram';
COMMENT ON TABLE kaetram_equipment IS 'Экипировка игроков (JSON данные)';
COMMENT ON TABLE kaetram_inventory IS 'Инвентарь игроков (JSON данные)';
COMMENT ON TABLE kaetram_bank IS 'Банковское хранилище игроков (JSON данные)';
COMMENT ON TABLE kaetram_quests IS 'Прогресс по квестам (JSON данные)';
COMMENT ON TABLE kaetram_achievements IS 'Достижения игроков (JSON данные)';
COMMENT ON TABLE kaetram_skills IS 'Навыки и опыт игроков (JSON данные)';
COMMENT ON TABLE kaetram_statistics IS 'Статистика игроков (JSON данные)';
COMMENT ON TABLE kaetram_abilities IS 'Способности и умения игроков (JSON данные)';
COMMENT ON TABLE kaetram_guilds IS 'Гильдии игроков';
COMMENT ON TABLE kaetram_ipbans IS 'Забаненные IP адреса';
