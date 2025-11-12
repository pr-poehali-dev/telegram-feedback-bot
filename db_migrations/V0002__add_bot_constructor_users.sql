-- Добавляем таблицу для хранения состояний пользователей бота-конструктора
CREATE TABLE IF NOT EXISTS bot_constructor_users (
    id SERIAL PRIMARY KEY,
    telegram_user_id BIGINT NOT NULL UNIQUE,
    telegram_username VARCHAR(255),
    state VARCHAR(50) DEFAULT 'idle',
    state_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индекс для быстрого поиска по telegram_user_id
CREATE INDEX IF NOT EXISTS idx_bot_constructor_users_telegram_id ON bot_constructor_users(telegram_user_id);
