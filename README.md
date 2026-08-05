# emulatorjs-cf

Cloudflare Workers migration of [alphatsui/emulatorjs](https://github.com/alphatsui/emulatorjs) — a self-hosted web-based retro emulation frontend with ROM and art management.

Replaces the Docker-based backend (Express + Socket.IO + cloudcmd + IPFS) with a serverless Worker + Pages + R2 architecture.

## Architecture

```
Browser → Cloudflare Pages (static frontend + WASM cores)
Browser → Cloudflare Worker → R2 (ROMs, art, config, profiles)
Browser → Durable Object (WebSocket, replaces Socket.IO)
Admin  → Pages admin UI (ROM/art upload, file browser)
```

## Monorepo structure

```
apps/
  worker/       — Cloudflare Worker (Hono + R2 + Durable Objects)
  pages/        — Cloudflare Pages (admin UI, ROM/art management)
  realtime/     — Durable Object re-exports (RoomDO, ScannerDO)
packages/
  shared/       — TypeScript types (ROM, Config, WsEnvelope, CONSOLES)
infra/
  r2-bootstrap.sh — Creates R2 buckets + seeds default configs
docs/
  deploy.md     — End-to-end deploy guide
  auth.md       — Shared-secret → Cloudflare Access migration
  socketio-mapping.md — Upstream socket.io event → DO WebSocket mapping
```

## Quick start

```bash
pnpm install
cd apps/worker
wrangler dev          # local dev with mock R2
```

## Production deploy

See [docs/deploy.md](docs/deploy.md).

## What changed from upstream

| Upstream | Workers migration |
|---|---|
| Express + Socket.IO | Hono + Durable Object (Hibernating WebSocket) |
| `cloudcmd` file browser | Pages admin UI (drag-drop upload, list, delete) |
| `child_process.spawn` ROM scanner | `ScannerDO` (pure-JS SHA-256 in Worker) |
| IPFS daemon (Kubo) for art | R2 storage + admin UI upload |
| Container filesystem | R2 buckets (roms, art, config, profiles) |
| nginx static serving | Cloudflare Pages |

## What's preserved

- All 31 console definitions with video positions
- COEP/COOP headers (required for SharedArrayBuffer in WASM cores)
- Profile sync (username → hash → save states in R2)
- Per-console config JSON structure
- HTTP Range support for ROM streaming

## License

Same as upstream [EmulatorJS](https://github.com/ethanaobrien/EmulatorJS).
