import db from '../db.js';

const TWO_MONTHS_MS = 60  * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS   = 365 * 24 * 60 * 60 * 1000;

const stmtActive   = db.prepare(`SELECT COUNT(*) AS n FROM devices WHERE last_seen >= ?`);
const stmtInactive = db.prepare(`SELECT COUNT(*) AS n FROM devices WHERE last_seen >= ? AND last_seen < ?`);

export default async function installCountRoute(fastify) {
  fastify.get('/install-count', async (request, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');

    const now = Date.now();
    const twoMonthsAgo = now - TWO_MONTHS_MS;
    const oneYearAgo   = now - ONE_YEAR_MS;

    return {
      active:   stmtActive.get(twoMonthsAgo).n,
      inactive: stmtInactive.get(oneYearAgo, twoMonthsAgo).n,
    };
  });
}
