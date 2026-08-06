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

app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html>
<head>
  <title>EmulatorJS Cloudflare Worker</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #1a1a2e; color: #e0e0e0; }
    h1 { color: #e94560; }
    .endpoint { background: #16213e; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 3px solid #e94560; }
    code { background: #0f3460; padding: 2px 6px; border-radius: 3px; }
    a { color: #e94560; }
  </style>
</head>
<body>
  <h1>EmulatorJS Cloudflare Worker</h1>
  <p>This Worker serves ROMs, art, and configuration from R2 storage for the EmulatorJS frontend.</p>
  
  <h2>API Endpoints</h2>
  
  <div class="endpoint">
    <strong>GET /api/health</strong><br>
    Health check endpoint
  </div>
  
  <div class="endpoint">
    <strong>GET /api/consoles</strong><br>
    List all supported consoles with video positions
  </div>
  
  <div class="endpoint">
    <strong>GET /api/config/:console</strong><br>
    Get configuration for a specific console
  </div>
  
  <div class="endpoint">
    <strong>GET /api/roms?console=:console</strong><br>
    List ROMs for a console
  </div>
  
  <div class="endpoint">
    <strong>GET /api/roms/:console/:file</strong><br>
    Stream a ROM file (supports Range requests)
  </div>
  
  <div class="endpoint">
    <strong>GET /api/art/:console/:type/:name</strong><br>
    Get art asset (logo, background, corner, video)
  </div>
  
  <div class="endpoint">
    <strong>GET /api/metadata/:console</strong><br>
    Get ROM metadata for a console
  </div>
  
  <div class="endpoint">
    <strong>GET /api/profiles</strong><br>
    List user profiles
  </div>
  
  <div class="endpoint">
    <strong>GET /ws?room=:room</strong><br>
    WebSocket connection for real-time sync (replaces Socket.IO)
  </div>
  
  <h2>Admin Endpoints</h2>
  <p>All admin endpoints require <code>Authorization: Bearer &lt;ADMIN_TOKEN&gt;</code> header.</p>
  
  <div class="endpoint">
    <strong>POST /api/admin/roms?console=:console</strong><br>
    Upload a ROM (multipart form, field: <code>rom</code>)
  </div>
  
  <div class="endpoint">
    <strong>GET /api/admin/roms</strong><br>
    List all ROMs across all consoles
  </div>
  
  <div class="endpoint">
    <strong>DELETE /api/admin/roms/:console/:file</strong><br>
    Delete a ROM
  </div>
  
  <div class="endpoint">
    <strong>POST /api/admin/art?console=:console&type=:type</strong><br>
    Upload art asset (multipart form, field: <code>art</code>)
  </div>
  
  <div class="endpoint">
    <strong>POST /api/admin/scan?console=:console</strong><br>
    Trigger ROM metadata scan
  </div>
  
  <h2>Frontend</h2>
  <p>The EmulatorJS frontend should be deployed separately to Cloudflare Pages.</p>
  <p>Source: <a href="https://github.com/alphatsui/emulatorjs-cf">github.com/alphatsui/emulatorjs-cf</a></p>
</body>
</html>`);
});

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'internal' }, 500);
});

export default app;
export { RoomDO } from './durable/room';
export { ScannerDO } from './durable/scanner';
