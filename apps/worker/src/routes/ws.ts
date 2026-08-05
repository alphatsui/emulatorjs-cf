import type { Context } from 'hono';
import type { Env } from '../env.d';

export async function wsRoute(c: Context<{ Bindings: Env }>) {
  const room = c.req.query('room') || 'default';
  const id = c.env.ROOM.idFromName(room);
  const stub = c.env.ROOM.get(id);

  const upgradeHeader = c.req.header('Upgrade') || '';
  if (upgradeHeader.toLowerCase() !== 'websocket') {
    return c.json({ error: 'expected websocket upgrade' }, 426);
  }

  const pair = new WebSocketPair();
  const [client, server] = [pair[0], pair[1]];

  const resp = await stub.fetch(new Request('http://do/connect', {
    headers: { 'Upgrade': 'websocket' },
  }), { server });

  return new Response(null, {
    status: 101,
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
      'Sec-WebSocket-Accept': c.req.header('Sec-WebSocket-Key') || '',
    },
    webSocket: client,
  });
}
