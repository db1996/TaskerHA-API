const FDROID_URL = 'https://f-droid.org/api/v1/packages/com.github.db1996.taskerha';

// Simple in-memory cache — F-Droid updates infrequently
let cache = { version: null, fetchedAt: 0 };
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export default async function fdroidRoute(fastify) {
  fastify.get('/fdroid-version', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');

    const now = Date.now();
    if (cache.version && now - cache.fetchedAt < CACHE_TTL_MS) {
      return { version: cache.version };
    }

    try {
      const res = await fetch(FDROID_URL);
      if (!res.ok) throw new Error(`F-Droid responded with ${res.status}`);

      const data = await res.json();
      const pkgs = data.packages ?? [];
      const suggested = pkgs.find(p => p.versionCode === data.suggestedVersionCode);
      const version = 'v' + (suggested?.versionName ?? pkgs[0]?.versionName ?? '');

      cache = { version, fetchedAt: now };
      return { version };
    } catch (err) {
      fastify.log.error(err, 'Failed to fetch F-Droid version');
      if (cache.version) return { version: cache.version };
      return reply.code(502).send({ error: 'Failed to fetch F-Droid version' });
    }
  });
}
