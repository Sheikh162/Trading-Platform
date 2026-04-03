BEGIN;

INSERT INTO users (id, email)
VALUES
  ('2', 'mm-buy-bot@local'),
  ('5', 'mm-sell-bot@local')
ON CONFLICT (id) DO UPDATE
SET email = COALESCE(users.email, EXCLUDED.email);

INSERT INTO balances (user_id, asset, available, locked)
VALUES
  ('2', 'USDT', 1000000000000, 0),
  ('2', 'BTC', 1000000, 0),
  ('2', 'SOL', 100000000, 0),
  ('5', 'USDT', 1000000000000, 0),
  ('5', 'BTC', 1000000, 0),
  ('5', 'SOL', 100000000, 0)
ON CONFLICT (user_id, asset) DO UPDATE
SET
  available = GREATEST(balances.available, EXCLUDED.available),
  locked = balances.locked,
  updated_at = NOW();

COMMIT;

INSERT INTO schema_migrations (version)
VALUES ('002_market_maker_bots')
ON CONFLICT (version) DO NOTHING;
