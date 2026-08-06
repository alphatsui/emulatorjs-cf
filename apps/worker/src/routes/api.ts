import { Hono } from 'hono';
import type { Env } from '../env.d';
import { getBucket, r2Key } from '../lib/r2';
import { CONSOLES } from '@emulatorjs-cf/shared';

export const apiRoutes = new Hono<{ Bindings: Env }>();

apiRoutes.get('/config/:console', async (c) => {
  const console = c.req.param('console');
  const bucket = getBucket(c, 'config');
  const key = r2Key('config', `${console}.json`);
  const obj = await bucket.get(key);
  if (!obj) return c.json({ items: {}, display_items: 0, defaults: {}, name: console }, 200);
  return c.json(await obj.json());
});

apiRoutes.get('/roms', async (c) => {
  const console = c.req.query('console');
  if (!console) return c.json({ error: 'console required' }, 400);
  const bucket = getBucket(c, 'roms');
  const prefix = r2Key('roms', console) + '/';
  const listed = await bucket.list({ prefix, limit: 1000 });
  const roms = listed.objects.map((o) => ({
    name: o.key.slice(prefix.length),
    size: o.size,
    etag: o.etag,
    lastModified: o.uploaded?.toISOString(),
  }));
  return c.json(roms);
});

apiRoutes.get('/roms/:console/:file{.+}', async (c) => {
  const console = c.req.param('console');
  const file = c.req.param('file');
  const bucket = getBucket(c, 'roms');
  const key = r2Key('roms', console, file);
  const obj = await bucket.get(key);
  if (!obj) return c.json({ error: 'not found' }, 404);

  const range = c.req.header('Range');
  const headers: Record<string, string> = {
    'Content-Type': guessContentType(file),
    'Content-Disposition': `inline; filename="${file}"`,
    'Accept-Ranges': 'bytes',
  };

  if (range && obj.body) {
    const match = range.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const start = parseInt(match[1]!, 10);
      const end = match[2] ? parseInt(match[2], 10) : obj.size - 1;
      const slice = (obj.body as ReadableStream).tee
        ? await sliceStream(obj, start, end)
        : obj.body;
      headers['Content-Range'] = `bytes ${start}-${end}/${obj.size}`;
      headers['Content-Length'] = String(end - start + 1);
      return new Response(slice, { status: 206, headers });
    }
  }

  headers['Content-Length'] = String(obj.size);
  return new Response(obj.body, { headers });
});

apiRoutes.get('/art/:console/:type/:name', async (c) => {
  const console = c.req.param('console');
  const type = c.req.param('type');
  const name = c.req.param('name');
  const bucket = getBucket(c, 'art');
  const key = r2Key('art', console, type, name);
  const obj = await bucket.get(key);
  if (!obj) return c.json({ error: 'not found' }, 404);
  return new Response(obj.body, {
    headers: {
      'Content-Type': guessContentType(name),
      'Content-Length': String(obj.size),
    },
  });
});

apiRoutes.get('/metadata/:console', async (c) => {
  const console = c.req.param('console');
  const bucket = getBucket(c, 'config');
  const key = r2Key('metadata', `${console}.json`);
  const obj = await bucket.get(key);
  if (!obj) return c.json({}, 200);
  return c.json(await obj.json());
});

apiRoutes.get('/profiles', async (c) => {
  const bucket = getBucket(c, 'profiles');
  const listed = await bucket.list({ prefix: 'profile.json' });
  const obj = listed.objects.length ? await bucket.get('profile.json') : null;
  if (!obj) return c.json([]);
  const profiles = await obj.json() as Record<string, { username: string }>;
  return c.json(Object.values(profiles).map((p) => p.username));
});

apiRoutes.get('/profiles/:id', async (c) => {
  const id = c.req.param('id');
  const bucket = getBucket(c, 'profiles');
  const key = r2Key('profiles', id);
  const obj = await bucket.get(key);
  if (!obj) return c.json({ error: 'not found' }, 404);
  return c.json(await obj.json());
});

apiRoutes.get('/consoles', (c) => {
  return c.json(CONSOLES);
});

async function sliceStream(obj: R2ObjectBody, start: number, end: number): Promise<ReadableStream> {
  const { readable, writable } = new TransformStream();
  const reader = obj.body.getReader();
  let bytesSkipped = 0;
  let bytesRead = 0;
  const targetBytes = end - start + 1;

  (async () => {
    const writer = writable.getWriter();
    try {
      while (bytesRead < targetBytes) {
        const { done, value } = await reader.read();
        if (done) break;

        if (bytesSkipped < start) {
          bytesSkipped += value.length;
          if (bytesSkipped >= start) {
            const offset = value.length - (bytesSkipped - start);
            const toWrite = Math.min(targetBytes - bytesRead, value.length - offset);
            writer.write(value.slice(offset, offset + toWrite));
            bytesRead += toWrite;
          }
        } else {
          const remaining = targetBytes - bytesRead;
          const toWrite = Math.min(remaining, value.length);
          writer.write(value.slice(0, toWrite));
          bytesRead += toWrite;
        }
      }
    } finally {
      writer.close();
    }
  })();

  return readable;
}

function guessContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    nes: 'application/octet-stream',
    smc: 'application/octet-stream',
    sfc: 'application/octet-stream',
    gb: 'application/octet-stream',
    gba: 'application/octet-stream',
    gbc: 'application/octet-stream',
    nds: 'application/octet-stream',
    n64: 'application/octet-stream',
    z64: 'application/octet-stream',
    bin: 'application/octet-stream',
    iso: 'application/octet-stream',
    chd: 'application/octet-stream',
    cue: 'application/octet-stream',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    mp4: 'video/mp4',
    json: 'application/json',
    zip: 'application/zip',
  };
  return map[ext || ''] || 'application/octet-stream';
}
