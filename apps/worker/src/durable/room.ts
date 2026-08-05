import { DurableObject } from 'cloudflare:workers';
import type { WsEnvelope } from '@emulatorjs-cf/shared';

export class RoomDO extends DurableObject {
  private sockets: WebSocket[] = [];

  async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get('Upgrade') || '';
    if (upgrade.toLowerCase() !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    this.ctx.acceptWebSocket(server);
    this.sockets.push(server);

    server.addEventListener('message', (evt) => {
      this.handleMessage(server, evt.data as string);
    });

    server.addEventListener('close', (evt) => {
      this.sockets = this.sockets.filter((s) => s !== server);
    });

    server.addEventListener('error', () => {
      this.sockets = this.sockets.filter((s) => s !== server);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private handleMessage(sender: WebSocket, raw: string) {
    let envelope: WsEnvelope;
    try {
      envelope = JSON.parse(raw);
    } catch {
      sender.send(JSON.stringify({ event: 'error', data: 'invalid json' }));
      return;
    }

    if (envelope.event === 'ping') {
      sender.send(JSON.stringify({ event: 'pong', ts: Date.now() }));
      return;
    }

    for (const ws of this.sockets) {
      if (ws !== sender && ws.readyState === WebSocket.OPEN) {
        ws.send(raw);
      }
    }
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    const raw = typeof message === 'string' ? message : new TextDecoder().decode(message);
    this.handleMessage(ws, raw);
  }

  async webSocketClose(ws: WebSocket) {
    this.sockets = this.sockets.filter((s) => s !== ws);
  }

  async webSocketError(ws: WebSocket) {
    this.sockets = this.sockets.filter((s) => s !== ws);
  }
}
