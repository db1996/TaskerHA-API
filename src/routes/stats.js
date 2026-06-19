import db from "../db.js";

const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const stmtActive = db.prepare(
    `SELECT COUNT(*) AS n FROM devices WHERE last_seen >= ?`,
);
const stmtInactive = db.prepare(
    `SELECT COUNT(*) AS n FROM devices WHERE last_seen >= ? AND last_seen < ?`,
);
const stmtDead = db.prepare(
    `SELECT COUNT(*) AS n FROM devices WHERE last_seen < ?`,
);

export default async function statsRoute(fastify) {
    fastify.get("/stats", async (request, reply) => {
        const adminKey = process.env.ADMIN_KEY;
        if (adminKey && request.headers["x-admin-key"] !== adminKey) {
            return reply.code(401).send({ error: "Unauthorized" });
        }

        const now = Date.now();
        const twoMonthsAgo = now - TWO_MONTHS_MS;
        const oneYearAgo = now - ONE_YEAR_MS;

        return {
            active: stmtActive.get(twoMonthsAgo).n, // seen within 2 months
            inactive: stmtInactive.get(oneYearAgo, twoMonthsAgo).n, // 2 months–1 year
            dead: stmtDead.get(oneYearAgo).n, // not seen for 1+ year
        };
    });
}
