import { Hono } from 'hono';
import type { Env } from '../env.d';
import { authMiddleware } from '../lib/auth';
import { getBucket, r2Key } from '../lib/r2';
import { CONSOLES, META_VARIABLES } from '@emulatorjs-cf/shared';

export const adminRoutes = new Hono<{ Bindings: Env }>();

adminRoutes.use('*', authMiddleware);

adminRoutes.post('/roms', async (c) => {
  const console = c.req.query('console');
  if (!console) return c.json({ error: 'console required' }, 400);

  const formData = await c.req.formData();
  const file = formData.get('rom') as File | null;
  if (!file) return c.json({ error: 'rom file required' }, 400);

  const buf = await file.arrayBuffer();
  const hash = await sha256(buf);
  const bucket = getBucket(c, 'roms');
  const key = r2Key('roms', console, `${hash.slice(0, 16)}--${file.name}`);

  await bucket.put(key, buf, {
    customMetadata: { originalName: file.name, console, uploadedAt: new Date().toISOString() },
  });

  return c.json({ key, name: file.name, size: buf.byteLength, hash }, 201);
});

adminRoutes.get('/roms', async (c) => {
  const bucket = getBucket(c, 'roms');
  const listed = await bucket.list({ prefix: 'roms/', limit: 1000 });
  return c.json(listed.objects.map((o) => ({
    key: o.key,
    size: o.size,
    etag: o.etag,
    uploaded: o.uploaded?.toISOString(),
    metadata: o.customMetadata,
  })));
});

adminRoutes.delete('/roms/:console/:file{.+}', async (c) => {
  const console = c.req.param('console');
  const file = c.req.param('file');
  const bucket = getBucket(c, 'roms');
  const key = r2Key('roms', console, file);
  await bucket.delete(key);
  return c.json({ deleted: key });
});

adminRoutes.post('/art', async (c) => {
  const console = c.req.query('console');
  const type = c.req.query('type');
  if (!console || !type) return c.json({ error: 'console and type required' }, 400);

  const formData = await c.req.formData();
  const file = formData.get('art') as File | null;
  if (!file) return c.json({ error: 'art file required' }, 400);

  const buf = await file.arrayBuffer();
  const hash = await sha256(buf);
  const ext = '.' + file.name.split('.').pop();
  const bucket = getBucket(c, 'art');
  const key = r2Key('art', console, type, `${hash.slice(0, 16)}${ext}`);

  await bucket.put(key, buf, {
    customMetadata: { originalName: file.name, console, type },
  });

  return c.json({ key, name: file.name, size: buf.byteLength, hash }, 201);
});

adminRoutes.post('/scan', async (c) => {
  const console = c.req.query('console');
  if (!console) return c.json({ error: 'console required' }, 400);

  const id = c.env.SCANNER.idFromName(`scan-${console}`);
  const stub = c.env.SCANNER.get(id);
  const resp = await stub.fetch(new Request('http://scanner/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ console }),
  }));
  return c.json(await resp.json());
});

adminRoutes.post('/profiles', async (c) => {
  const body = await c.req.json();
  const { username, data } = body;
  if (!username) return c.json({ error: 'username required' }, 400);

  const bucket = getBucket(c, 'profiles');
  const profileJson = await bucket.get('profile.json');
  let profiles: Record<string, { username: string }> = {};
  if (profileJson) profiles = await profileJson.json() as Record<string, { username: string }>;

  const hash = await sha256Str(username);
  profiles[hash] = { username };

  await bucket.put('profile.json', JSON.stringify(profiles, null, 2));
  if (data) {
    await bucket.put(r2Key('profiles', username), JSON.stringify(data));
  }

  return c.json({ username, hash }, 201);
});

adminRoutes.delete('/profiles/:username', async (c) => {
  const username = c.req.param('username');
  const bucket = getBucket(c, 'profiles');

  const profileJson = await bucket.get('profile.json');
  let profiles: Record<string, { username: string }> = {};
  if (profileJson) profiles = await profileJson.json() as Record<string, { username: string }>;

  for (const [hash, entry] of Object.entries(profiles)) {
    if (entry.username === username) delete profiles[hash];
  }
  await bucket.put('profile.json', JSON.stringify(profiles, null, 2));
  await bucket.delete(r2Key('profiles', username));

  return c.json({ deleted: username });
});

async function sha256(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Str(s: string): Promise<string> {
  return sha256(new TextEncoder().encode(s).buffer as ArrayBuffer);
}
