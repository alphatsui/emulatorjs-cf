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

app.get('/admin', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EmulatorJS Admin</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a2e; color: #e0e0e0; }
    .header { background: #16213e; padding: 1rem 2rem; display: flex; align-items: center; gap: 1rem; border-bottom: 2px solid #0f3460; }
    .header h1 { font-size: 1.2rem; color: #e94560; }
    .container { max-width: 1200px; margin: 2rem auto; padding: 0 1rem; }
    .panel { background: #16213e; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid #0f3460; }
    .panel h2 { font-size: 1rem; margin-bottom: 1rem; color: #e94560; }
    .file-list { list-style: none; }
    .file-list li { padding: 0.5rem 0.75rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #0f3460; }
    .file-list li:last-child { border-bottom: none; }
    .file-name { font-family: monospace; font-size: 0.9rem; }
    .file-size { color: #888; font-size: 0.8rem; }
    .btn { padding: 0.4rem 0.8rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
    .btn-primary { background: #e94560; color: white; }
    .btn-danger { background: #c0392b; color: white; }
    .btn:hover { opacity: 0.85; }
    .drop-zone { border: 2px dashed #0f3460; border-radius: 8px; padding: 2rem; text-align: center; margin-bottom: 1rem; transition: border-color 0.2s; }
    .drop-zone.active { border-color: #e94560; }
    .drop-zone p { color: #888; }
    select, input { background: #1a1a2e; color: #e0e0e0; border: 1px solid #0f3460; padding: 0.4rem 0.6rem; border-radius: 4px; font-size: 0.9rem; }
    .toolbar { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; }
    .status { font-size: 0.8rem; color: #888; margin-top: 0.5rem; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>EmulatorJS Admin</h1>
    <span style="color:#888;font-size:0.8rem;">Cloudflare Workers + R2</span>
  </div>
  <div class="container">
    <div class="panel">
      <h2>ROM Management</h2>
      <div class="toolbar">
        <label>Console:</label>
        <select id="consoleSelect"></select>
        <button class="btn btn-primary" id="refreshBtn">Refresh</button>
        <button class="btn btn-danger" id="deleteBtn">Delete Selected</button>
      </div>
      <div class="drop-zone" id="dropZone">
        <p>Drag & drop ROM files here, or click to upload</p>
        <input type="file" id="fileInput" multiple style="display:none">
      </div>
      <div class="status" id="uploadStatus"></div>
      <ul class="file-list" id="romList"></ul>
    </div>
    <div class="panel">
      <h2>Art Management</h2>
      <div class="toolbar">
        <label>Type:</label>
        <select id="artType">
          <option value="logos">Logo (PNG)</option>
          <option value="backgrounds">Background (PNG)</option>
          <option value="corners">Corner (PNG)</option>
          <option value="videos">Video (MP4)</option>
        </select>
        <button class="btn btn-primary" id="uploadArtBtn">Upload Art</button>
      </div>
      <input type="file" id="artInput" style="display:none">
      <div class="status" id="artStatus"></div>
    </div>
  </div>
  <script>
    const API_BASE = window.location.origin;
    let adminToken = sessionStorage.getItem('admin_token') || '';
    if (!adminToken) {
      adminToken = prompt('Enter admin token:') || '';
      sessionStorage.setItem('admin_token', adminToken);
    }

    const CONSOLES = ['3do','arcade','atari2600','atari5200','atari7800','colecovision','doom','gb','gba','gbc','jaguar','lynx','msx','n64','nds','nes','ngp','odyssey2','pce','psx','sega32x','segaCD','segaGG','segaMD','segaMS','segaSG','segaSaturn','snes','vb','vectrex','ws'];

    const consoleSelect = document.getElementById('consoleSelect');
    CONSOLES.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; consoleSelect.appendChild(o); });

    async function apiFetch(path, opts = {}) {
      const headers = { 'Authorization': \`Bearer \${adminToken}\`, ...(opts.headers || {}) };
      const resp = await fetch(\`\${API_BASE}\${path}\`, { ...opts, headers });
      if (!resp.ok) throw new Error(\`\${resp.status}: \${await resp.text()}\`);
      return resp;
    }

    async function loadRoms() {
      const console = consoleSelect.value;
      const resp = await apiFetch(\`/api/roms?console=\${console}\`);
      const roms = await resp.json();
      const list = document.getElementById('romList');
      list.innerHTML = '';
      roms.forEach(rom => {
        const li = document.createElement('li');
        li.innerHTML = \`<span class="file-name">\${rom.name}</span><span class="file-size">\${(rom.size / 1024 / 1024).toFixed(2)} MB</span>\`;
        list.appendChild(li);
      });
    }

    document.getElementById('refreshBtn').addEventListener('click', loadRoms);
    consoleSelect.addEventListener('change', loadRoms);

    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('active'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('active'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('active');
      uploadRoms(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', () => { uploadRoms(fileInput.files); fileInput.value = ''; });

    async function uploadRoms(files) {
      const status = document.getElementById('uploadStatus');
      for (const file of files) {
        status.textContent = \`Uploading \${file.name}...\`;
        const fd = new FormData();
        fd.append('rom', file);
        try {
          await apiFetch(\`/api/admin/roms?console=\${consoleSelect.value}\`, { method: 'POST', body: fd });
          status.textContent = \`Uploaded \${file.name}\`;
        } catch (e) {
          status.textContent = \`Error: \${e.message}\`;
        }
      }
      loadRoms();
    }

    document.getElementById('uploadArtBtn').addEventListener('click', () => document.getElementById('artInput').click());
    document.getElementById('artInput').addEventListener('change', async () => {
      const file = document.getElementById('artInput').files[0];
      if (!file) return;
      const status = document.getElementById('artStatus');
      const fd = new FormData();
      fd.append('art', file);
      try {
        await apiFetch(\`/api/admin/art?console=\${consoleSelect.value}&type=\${document.getElementById('artType').value}\`, { method: 'POST', body: fd });
        status.textContent = \`Uploaded \${file.name}\`;
      } catch (e) {
        status.textContent = \`Error: \${e.message}\`;
      }
      document.getElementById('artInput').value = '';
    });

    loadRoms();
  </script>
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
