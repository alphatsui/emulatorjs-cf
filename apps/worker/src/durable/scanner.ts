import { DurableObject } from 'cloudflare:workers';
import { CONSOLES, META_VARIABLES } from '@emulatorjs-cf/shared';

export class ScannerDO extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/scan' && request.method === 'POST') {
      const body = await request.json() as { console: string };
      const result = await this.scanConsole(body.console);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('not found', { status: 404 });
  }

  private async scanConsole(consoleName: string): Promise<{ console: string; roms: number; metadata: Record<string, unknown> }> {
    const romsBinding = (this.ctx as unknown as { getBinding: (name: string) => R2Bucket }).getBinding?.('ROMS');
    const configBinding = (this.ctx as unknown as { getBinding: (name: string) => R2Bucket }).getBinding?.('CONFIG');

    const roms: Record<string, unknown> = {};
    let romCount = 0;

    if (romsBinding) {
      const prefix = `roms/${consoleName}/`;
      const listed = await romsBinding.list({ prefix, limit: 1000 });
      romCount = listed.objects.length;

      for (const obj of listed.objects) {
        const name = obj.key.slice(prefix.length);
        const hashBuf = await crypto.subtle.digest('SHA-256', await obj.arrayBuffer());
        const hash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
        roms[name] = { sha256: hash, size: obj.size };
      }
    }

    const metadata = { scanned: new Date().toISOString(), romCount, roms };

    if (configBinding) {
      await configBinding.put(`metadata/${consoleName}.json`, JSON.stringify(metadata, null, 2));
    }

    return { console: consoleName, roms: romCount, metadata };
  }
}
