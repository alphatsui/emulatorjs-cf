## Auth

### v1: Shared secret (current)

The Worker reads `ADMIN_TOKEN` from `vars` (dev) or `wrangler secret` (prod).

All `/api/admin/*` endpoints require:

```
Authorization: Bearer <ADMIN_TOKEN>
```

The comparison is constant-time (byte-by-byte XOR) to prevent timing attacks.

### Migration path: Cloudflare Access

To swap in Cloudflare Access:

1. Create an Access Application in the Cloudflare dashboard pointing at the Worker's custom domain.
2. Add an Access Policy (e.g., email allowlist, GitHub OAuth).
3. Remove the `authMiddleware` from `apps/worker/src/routes/admin.ts` — Access handles auth at the edge.
4. Optionally keep the Bearer check as a fallback for API-only clients (CLI tools).

No code changes needed beyond removing the middleware. Access policies are configured in the dashboard, not in code.
