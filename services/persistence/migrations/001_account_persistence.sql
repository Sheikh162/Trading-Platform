BEGIN;

CREATE TYPE order_side AS ENUM ('buy', 'sell');
CREATE TYPE order_type AS ENUM ('limit', 'market');
CREATE TYPE order_status AS ENUM ('open', 'partially_filled', 'filled', 'cancelled', 'rejected');
CREATE TYPE transfer_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE ledger_entry_type AS ENUM (
  'deposit_credit',
  'withdrawal_debit',
  'withdrawal_reversal',
  'order_lock',
  'order_unlock',
  'trade_debit',
  'trade_credit',
  'fee_debit'
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  decimals INTEGER NOT NULL DEFAULT 8,
  icon_url TEXT,
  circulating_supply NUMERIC(36, 18) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS balances (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset TEXT NOT NULL REFERENCES assets(symbol),
  available NUMERIC(36, 18) NOT NULL DEFAULT 0,
  locked NUMERIC(36, 18) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, asset),
  CONSTRAINT balances_available_nonnegative CHECK (available >= 0),
  CONSTRAINT balances_locked_nonnegative CHECK (locked >= 0)
);

ALTER TABLE balances
  ADD COLUMN IF NOT EXISTS available NUMERIC(36, 18) NOT NULL DEFAULT 0;

ALTER TABLE balances
  ADD COLUMN IF NOT EXISTS locked NUMERIC(36, 18) NOT NULL DEFAULT 0;

ALTER TABLE balances
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE balances
  ADD COLUMN IF NOT EXISTS balance NUMERIC(36, 18);

UPDATE balances
SET available = COALESCE(available, balance, 0)
WHERE balance IS NOT NULL;

ALTER TABLE balances
  DROP COLUMN IF EXISTS balance;

CREATE TABLE IF NOT EXISTS markets (
  symbol TEXT PRIMARY KEY,
  base_asset TEXT NOT NULL REFERENCES assets(symbol),
  quote_asset TEXT NOT NULL REFERENCES assets(symbol),
  status TEXT NOT NULL DEFAULT 'active',
  tick_size NUMERIC(36, 18) NOT NULL DEFAULT 0.01,
  step_size NUMERIC(36, 18) NOT NULL DEFAULT 0.00001,
  min_order_size NUMERIC(36, 18) NOT NULL DEFAULT 0.00001,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (base_asset, quote_asset)
);

CREATE TABLE IF NOT EXISTS deposits (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_symbol TEXT NOT NULL REFERENCES assets(symbol),
  amount NUMERIC(36, 18) NOT NULL CHECK (amount > 0),
  status transfer_status NOT NULL DEFAULT 'pending',
  provider TEXT,
  provider_ref TEXT UNIQUE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_symbol TEXT NOT NULL REFERENCES assets(symbol),
  amount NUMERIC(36, 18) NOT NULL CHECK (amount > 0),
  status transfer_status NOT NULL DEFAULT 'pending',
  destination_type TEXT,
  destination_ref TEXT,
  provider_ref TEXT UNIQUE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_symbol TEXT NOT NULL REFERENCES markets(symbol),
  side order_side NOT NULL,
  type order_type NOT NULL DEFAULT 'limit',
  price NUMERIC(36, 18),
  quantity NUMERIC(36, 18) NOT NULL CHECK (quantity > 0),
  filled_quantity NUMERIC(36, 18) NOT NULL DEFAULT 0 CHECK (filled_quantity >= 0),
  status order_status NOT NULL DEFAULT 'open',
  client_order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  CHECK (filled_quantity <= quantity)
);

CREATE INDEX IF NOT EXISTS idx_orders_user_status_created
  ON orders (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_market_status_created
  ON orders (market_symbol, status, created_at DESC);

CREATE TABLE IF NOT EXISTS trade_fills (
  id BIGSERIAL PRIMARY KEY,
  trade_id TEXT NOT NULL UNIQUE,
  market_symbol TEXT NOT NULL REFERENCES markets(symbol),
  price NUMERIC(36, 18) NOT NULL CHECK (price > 0),
  quantity NUMERIC(36, 18) NOT NULL CHECK (quantity > 0),
  quote_quantity NUMERIC(36, 18) NOT NULL CHECK (quote_quantity > 0),
  maker_order_id TEXT NOT NULL REFERENCES orders(id),
  taker_order_id TEXT NOT NULL REFERENCES orders(id),
  maker_user_id TEXT NOT NULL REFERENCES users(id),
  taker_user_id TEXT NOT NULL REFERENCES users(id),
  buyer_user_id TEXT NOT NULL REFERENCES users(id),
  seller_user_id TEXT NOT NULL REFERENCES users(id),
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_fills_market_time
  ON trade_fills (market_symbol, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_trade_fills_buyer_time
  ON trade_fills (buyer_user_id, executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_trade_fills_seller_time
  ON trade_fills (seller_user_id, executed_at DESC);

CREATE TABLE IF NOT EXISTS wallet_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_symbol TEXT NOT NULL REFERENCES assets(symbol),
  entry_type ledger_entry_type NOT NULL,
  amount NUMERIC(36, 18) NOT NULL,
  balance_after_available NUMERIC(36, 18),
  balance_after_locked NUMERIC(36, 18),
  reference_table TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_asset_time
  ON wallet_ledger (user_id, asset_symbol, created_at DESC);

CREATE TABLE IF NOT EXISTS on_ramps (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trades (
  time TIMESTAMPTZ NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  volume DOUBLE PRECISION NOT NULL,
  currency_code VARCHAR(20) NOT NULL
);

INSERT INTO assets (symbol, name, decimals, icon_url, circulating_supply)
VALUES
  ('USDT', 'Tether', 6, '/usdt.png', 1),
  ('BTC', 'Bitcoin', 8, '/btc.png', 19600000),
  ('SOL', 'Solana', 9, '/solana-icon.png', 460000000)
ON CONFLICT (symbol) DO UPDATE
SET
  name = EXCLUDED.name,
  decimals = EXCLUDED.decimals,
  icon_url = EXCLUDED.icon_url,
  circulating_supply = EXCLUDED.circulating_supply;

INSERT INTO markets (symbol, base_asset, quote_asset, status, tick_size, step_size, min_order_size)
VALUES
  ('BTC_USDT', 'BTC', 'USDT', 'active', 0.01, 0.00001, 0.00001),
  ('SOL_USDT', 'SOL', 'USDT', 'active', 0.01, 0.001, 0.001)
ON CONFLICT (symbol) DO UPDATE
SET
  base_asset = EXCLUDED.base_asset,
  quote_asset = EXCLUDED.quote_asset,
  status = EXCLUDED.status,
  tick_size = EXCLUDED.tick_size,
  step_size = EXCLUDED.step_size,
  min_order_size = EXCLUDED.min_order_size;

INSERT INTO deposits (user_id, asset_symbol, amount, status, provider, provider_ref, requested_at, completed_at)
SELECT
  user_id,
  'USDT',
  amount,
  CASE
    WHEN LOWER(status) IN ('success', 'completed') THEN 'completed'::transfer_status
    WHEN LOWER(status) = 'failed' THEN 'failed'::transfer_status
    ELSE 'pending'::transfer_status
  END,
  'legacy_onramp',
  token,
  created_at,
  CASE WHEN LOWER(status) IN ('success', 'completed') THEN created_at ELSE NULL END
FROM on_ramps
ON CONFLICT (provider_ref) DO NOTHING;

INSERT INTO schema_migrations (version)
VALUES ('001_account_persistence')
ON CONFLICT (version) DO NOTHING;

COMMIT;
