import db from '../db.js';

const FDROID_URL  = 'https://f-droid.org/api/v1/packages/com.github.db1996.taskerha';
const GITHUB_URL  = 'https://api.github.com/repos/db1996/TaskerHa/releases/latest';
const REFETCH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes after a successful fetch

const TWO_MONTHS_MS = 60  * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS   = 365 * 24 * 60 * 60 * 1000;

const stmtActive      = db.prepare(`SELECT COUNT(*) AS n FROM devices WHERE last_seen >= ?`);
const stmtInactive    = db.prepare(`SELECT COUNT(*) AS n FROM devices WHERE last_seen >= ? AND last_seen < ?`);
const stmtGetVersion  = db.prepare(`SELECT version, fetched_at FROM versions WHERE key = ?`);
const stmtSaveVersion = db.prepare(`
  INSERT INTO versions (key, version, fetched_at) VALUES (?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET version = excluded.version, fetched_at = excluded.fetched_at
`);

function getStoredVersion(key) {
  return stmtGetVersion.get(key) ?? { version: null, fetched_at: 0 };
}

async function fetchFdroid() {
  const res = await fetch(FDROID_URL);
  if (!res.ok) throw new Error(`F-Droid responded with ${res.status}`);
  const data = await res.json();
  const pkgs = data.packages ?? [];
  const suggested = pkgs.find(p => p.versionCode === data.suggestedVersionCode);
  const version = 'v' + (suggested?.versionName ?? pkgs[0]?.versionName ?? '');
  if (!version || version === 'v') throw new Error('F-Droid returned no version');
  return version;
}

async function fetchGithub() {
  const res = await fetch(GITHUB_URL, {
    headers: { 'User-Agent': 'taskerha-api', Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub responded with ${res.status}`);
  const data = await res.json();
  if (!data.tag_name) throw new Error('GitHub returned no tag_name');
  return data.tag_name;
}

async function getVersion(fastify, key, fetchFn) {
  const now = Date.now();
  const stored = getStoredVersion(key);

  if (stored.version && now - stored.fetched_at < REFETCH_INTERVAL_MS) {
    return stored.version;
  }

  try {
    const version = await fetchFn();
    stmtSaveVersion.run(key, version, now);
    return version;
  } catch (err) {
    fastify.log.error(err, `Failed to fetch ${key} version`);
    return stored.version ?? null;
  }
}

export default async function dataRoute(fastify) {
  fastify.get('/data', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');

    const now = Date.now();
    const twoMonthsAgo = now - TWO_MONTHS_MS;
    const oneYearAgo   = now - ONE_YEAR_MS;

    const [fdroid_version, github_version] = await Promise.all([
      getVersion(fastify, 'fdroid', fetchFdroid),
      getVersion(fastify, 'github', fetchGithub),
    ]);

    return {
      install_count: {
        active:   stmtActive.get(twoMonthsAgo).n,
        inactive: stmtInactive.get(oneYearAgo, twoMonthsAgo).n,
      },
      fdroid_version,
      github_version,
    };
  });
}
