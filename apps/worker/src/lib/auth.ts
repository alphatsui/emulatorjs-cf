import type { Context, Next } from 'hono';
import type { Env } from '../env.d';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  const token = auth.slice(7);
  const expected = c.env.ADMIN_TOKEN;

  const tokenBytes = new TextEncoder().encode(token);
  const expectedBytes = new TextEncoder().encode(expected);

  if (tokenBytes.byteLength !== expectedBytes.byteLength) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  let result = 0;
  for (let i = 0; i < tokenBytes.byteLength; i++) {
    result |= tokenBytes[i]! ^ expectedBytes[i]!;
  }

  if (result !== 0) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  await next();
}
