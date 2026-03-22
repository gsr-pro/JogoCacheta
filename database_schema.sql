-- Schema SQL para o sistema de economia e loja do Cacheta dos Amigos

-- Tabela de Usuários
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY, -- Firebase UID
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    photo_url TEXT,
    coins INTEGER DEFAULT 10,
    premium_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Inventário (Itens comprados pelo usuário)
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL, -- Ex: 'card_gold', 'frame_neon', 'anim_fire'
    item_type VARCHAR(50) NOT NULL, -- Ex: 'cardBack', 'avatarFrame', 'winAnimation'
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, item_id) -- Um usuário não pode ter o mesmo item duas vezes
);

-- Tabela de Histórico de Transações (Compras na loja, ganhos de anúncios, etc)
CREATE TABLE transaction_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- Ex: 'purchase_item', 'buy_coins', 'ad_reward', 'daily_reward'
    amount INTEGER NOT NULL, -- Quantidade de fichas (positivo para ganho, negativo para gasto)
    item_id VARCHAR(100), -- ID do item comprado (se aplicável)
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Resgates Diários e Anúncios
CREATE TABLE daily_claims (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    claim_type VARCHAR(50) NOT NULL, -- Ex: 'daily_free', 'ad_reward'
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    claim_date DATE NOT NULL -- Para facilitar a contagem de resgates por dia
);

-- Índices para otimização de consultas
CREATE INDEX idx_inventory_user ON inventory(user_id);
CREATE INDEX idx_transactions_user ON transaction_history(user_id);
CREATE INDEX idx_daily_claims_user_date ON daily_claims(user_id, claim_date);
