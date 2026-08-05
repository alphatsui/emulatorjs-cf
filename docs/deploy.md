## Deploy

### Prerequisites

- Cloudflare account with R2 enabled
- `wrangler` CLI installed (`npm i -g wrangler`)
- Node.js 20+

### First deploy (temporary, no R2)

```bash
cd apps/worker
wrangler deploy --temporary
```

This creates a temporary Worker URL. R2 bindings won't work yet — the Worker uses a mock R2 shim (`R2_MODE=mock` in `wrangler.toml`).

### Production deploy

1. Run `infra/r2-bootstrap.sh` to create the 4 R2 buckets:

```bash
export CLOUDFLARE_ACCOUNT_ID=f20ba18d01ebd5442049903aba1d6f51
bash infra/r2-bootstrap.sh
```

2. Set the admin token:

```bash
cd apps/worker
wrangler secret put ADMIN_TOKEN
```

3. Update `wrangler.toml`: change `R2_MODE = "mock"` to `R2_MODE = "real"` (or remove the line).

4. Deploy:

```bash
wrangler deploy
```

### Pages deploy

```bash
cd apps/pages
npx wrangler pages deploy public --project-name emulatorjs-admin
```

### Smoke test

```bash
WORKER_URL=$(wrangler deploy --dry-run 2>/dev/null | grep -oP 'https://[^ ]+')

curl "${WORKER_URL}/api/health"
# {"ok":true,"ts":...}

curl "${WORKER_URL}/api/config/nes"
# {} or config JSON

curl -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -F "rom=@/tmp/test.nes" \
  "${WORKER_URL}/api/admin/roms?console=nes"
# {"key":"roms/nes/...","name":"test.nes",...}

curl "${WORKER_URL}/api/roms?console=nes"
# [{"name":"...","size":...}]
```

### WebSocket smoke

```bash
wscat -c "${WORKER_URL}/ws?room=test"
> {"event":"ping"}
< {"event":"pong","ts":...}
```
