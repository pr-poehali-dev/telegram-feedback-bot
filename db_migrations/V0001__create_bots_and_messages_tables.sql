-- Создаем таблицу для хранения ботов пользователей
CREATE TABLE IF NOT EXISTS bots (
    id SERIAL PRIMARY KEY,
    owner_id VARCHAR(255) NOT NULL,
    bot_token VARCHAR(255) NOT NULL UNIQUE,
    bot_username VARCHAR(255),
    welcome_text TEXT DEFAULT 'Привет! Напиши мне сообщение, и я передам его владельцу.',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создаем таблицу для хранения входящих сообщений
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    bot_id INTEGER REFERENCES bots(id),
    chat_id BIGINT NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_bots_owner_id ON bots(owner_id);
CREATE INDEX IF NOT EXISTS idx_messages_bot_id ON messages(bot_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_bots_bot_token ON bots(bot_token);