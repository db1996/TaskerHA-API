import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(process.env.DB_PATH || path.join(dataDir, 'app.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS devices (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid            TEXT    UNIQUE NOT NULL,
    last_seen       INTEGER NOT NULL,
    last_seen_version TEXT  NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_last_seen ON devices (last_seen);
`);

export default db;
