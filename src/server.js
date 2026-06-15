import 'dotenv/config';
import Fastify from 'fastify';
import pingRoute from './routes/ping.js';
import statsRoute from './routes/stats.js';

const REQUIRE_CF = process.env.REQUIRE_CF === 'true';
const APP_TOKEN  = process.env.APP_TOKEN;

const fastify = Fastify({ logger: true });

// Cloudflare + app-token guard on every request
fastify.addHook('onRequest', async (request, reply) => {
  if (REQUIRE_CF && !request.headers['cf-connecting-ip']) {
    return reply.code(403).send({ error: 'Forbidden' });
  }
  if (APP_TOKEN && request.headers['x-app-token'] !== APP_TOKEN) {
    return reply.code(403).send({ error: 'Forbidden' });
  }
});

await fastify.register(pingRoute);
await fastify.register(statsRoute);

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT) || 3000;

fastify.listen({ host, port }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
