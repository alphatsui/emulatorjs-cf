import type { Context, Next } from 'hono';

export async function coepMiddleware(c: Context, next: Next) {
  await next();
  c.header('Cross-Origin-Embedder-Policy', 'require-corp');
  c.header('Cross-Origin-Opener-Policy', 'same-origin');
}
