import db from '../db.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour — skip DB write if seen more recently

const stmtGet = db.prepare(`SELECT last_seen FROM devices WHERE uuid = ?`);
const stmtUpsert = db.prepare(`
  INSERT INTO devices (uuid, last_seen, last_seen_version)
  VALUES (?, ?, ?)
  ON CONFLICT(uuid) DO UPDATE SET
    last_seen = excluded.last_seen,
    last_seen_version = excluded.last_seen_version
`);

export default async function pingRoute(fastify) {
  fastify.post('/ping', {
    schema: {
      body: {
        type: 'object',
        required: ['uuid', 'version'],
        properties: {
          uuid:    { type: 'string', minLength: 36, maxLength: 36 },
          version: { type: 'string', minLength: 1,  maxLength: 32 },
        },
        additionalProperties: false,
      },
    },
  }, async (request, reply) => {
    const { uuid, version } = request.body;

    if (!UUID_RE.test(uuid)) {
      return reply.code(400).send({ error: 'Invalid UUID' });
    }

    const now = Date.now();
    const row = stmtGet.get(uuid);

    if (row && now - row.last_seen < RATE_LIMIT_MS) {
      return reply.code(204).send();
    }

    stmtUpsert.run(uuid, now, version);
    return reply.code(204).send();
  });
}
