import type { Context } from 'hono';
import type { Env } from '../env.d';

export function getBucket(c: Context<{ Bindings: Env }>, name: string): R2Bucket {
  const mode = c.env.R2_MODE;
  if (mode === 'mock') {
    return createMockBucket();
  }
  switch (name) {
    case 'roms': return c.env.ROMS;
    case 'art': return c.env.ART;
    case 'config': return c.env.CONFIG;
    case 'profiles': return c.env.PROFILES;
    default: throw new Error(`Unknown bucket: ${name}`);
  }
}

const mockStore = new Map<string, Map<string, { body: ArrayBuffer; metadata?: Record<string, string> }>>();

function createMockBucket(): R2Bucket {
  const id = Math.random().toString(36);
  if (!mockStore.has(id)) mockStore.set(id, new Map());
  const store = mockStore.get(id)!;

  return {
    get: async (key: string) => {
      const obj = store.get(key);
      if (!obj) return null;
      return {
        key,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(obj.body));
            controller.close();
          },
        }),
        bodyUsed: false,
        arrayBuffer: async () => obj.body,
        text: async () => new TextDecoder().decode(obj.body),
        json: async () => JSON.parse(new TextDecoder().decode(obj.body)),
        blob: async () => new Blob([obj.body]),
        size: obj.body.byteLength,
        etag: `"${key}"`,
        httpEtag: `"${key}"`,
        range: undefined,
        customMetadata: obj.metadata || {},
        httpMetadata: {},
        writeHttpMetadata: (_headers: Headers) => {},
      } as unknown as R2ObjectBody;
    },
    put: async (key: string, value: ArrayBuffer | string | ReadableStream, options?: R2PutOptions) => {
      let body: ArrayBuffer;
      if (typeof value === 'string') body = new TextEncoder().encode(value).buffer as ArrayBuffer;
      else if (value instanceof ArrayBuffer) body = value;
      else {
        const chunks: Uint8Array[] = [];
        const reader = (value as ReadableStream).getReader();
        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          chunks.push(chunk);
        }
        const total = chunks.reduce((s, c) => s + c.byteLength, 0);
        const merged = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
        body = merged.buffer as ArrayBuffer;
      }
      store.set(key, { body, metadata: options?.customMetadata as Record<string, string> || undefined });
      return { key, size: body.byteLength, etag: `"${key}"` } as unknown as R2Object;
    },
    delete: async (keys: string | string[]) => {
      const keyList = Array.isArray(keys) ? keys : [keys];
      for (const k of keyList) store.delete(k);
    },
    list: async (options?: R2ListOptions) => {
      const prefix = options?.prefix || '';
      const limit = options?.limit || 1000;
      const objects: R2Object[] = [];
      for (const [key, obj] of store.entries()) {
        if (key.startsWith(prefix) && objects.length < limit) {
          objects.push({
            key,
            size: obj.body.byteLength,
            etag: `"${key}"`,
            httpEtag: `"${key}"`,
            customMetadata: obj.metadata || {},
            httpMetadata: {},
            uploaded: new Date(),
            range: undefined,
            writeHttpMetadata: (_headers: Headers) => {},
          } as unknown as R2Object);
        }
      }
      return { objects, truncated: false } as R2Objects;
    },
    head: async (_key: string) => null as unknown as R2Object,
    createMultipartUpload: async () => null as unknown as R2MultipartUpload,
    resumeMultipartUpload: () => null as unknown as R2MultipartUpload,
  } as unknown as R2Bucket;
}

export function r2Key(prefix: string, ...parts: string[]): string {
  return [prefix, ...parts].filter(Boolean).join('/');
}
