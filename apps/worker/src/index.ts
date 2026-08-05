import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env.d';
import { apiRoutes } from './routes/api';
import { adminRoutes } from './routes/admin';
import { wsRoute } from './routes/ws';
import { coepMiddleware } from './lib/headers';

const app = new Hono<{ Bindings: Env }>();

app.use('*', coepMiddleware);
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
  credentials: true,
  maxAge: 86400,
}));

app.route('/api', apiRoutes);
app.route('/api/admin', adminRoutes);
app.get('/ws', wsRoute);

app.get('/api/health', (c) => c.json({ ok: true, ts: Date.now() }));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'internal' }, 500);
});

export default app;
export { RoomDO } from './durable/room';
export { ScannerDO } from './durable/scanner';
