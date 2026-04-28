CREATE TABLE IF NOT EXISTS qr_generation_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  bucket_hour TEXT NOT NULL,
  schedule_id TEXT NOT NULL,
  requested_timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qr_generation_events_bucket_hour
  ON qr_generation_events (bucket_hour);

CREATE INDEX IF NOT EXISTS idx_qr_generation_events_schedule_id
  ON qr_generation_events (schedule_id);
