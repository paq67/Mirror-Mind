# MirrorMind — Technical Document

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Single Service (Railway)                │
│                                                             │
│  ┌──────────────────┐    ┌───────────────────────────────┐  │
│  │  Express 5       │    │  React 19 + Vite              │  │
│  │  API Server      │◄──►│  Static Files                 │  │
│  │                  │    │  (served at /)                 │  │
│  │  /api/analyze    │    │                               │  │
│  │  /api/simulate   │    │  SPA catch-all → index.html   │  │
│  │  /api/compare    │    │                               │  │
│  │  /api/fix        │    └───────────────────────────────┘  │
│  │  /api/config     │                                       │
│  │  /health         │                                       │
│  └──────┬───────────┘                                       │
│         │                                                   │
│  ┌──────▼───────────────────────────────────────────────┐   │
│  │  Services Layer                                       │   │
│  │                                                       │   │
│  │  shopifyService    →  Fetch store data                │   │
│  │  scorerService     →  AI scoring (Groq/Llama 3.3)    │   │
│  │  personaService    →  3 persona simulations           │   │
│  │  fixService        →  Fix plan generation             │   │
│  │  temporalService   →  Drift detection                 │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

The entire application runs as a single process. Express serves both the API (`/api/*`) and the React frontend (`/`). This eliminates the need for separate frontend/backend deployments.

## Implementation Decisions

### Monorepo Structure (pnpm workspaces)

```
artifacts/api-server     # Express backend
artifacts/mirrormind     # React frontend
lib/api-zod              # Shared Zod validation schemas
lib/api-spec             # OpenAPI spec + Orval codegen
```

**Why pnpm**: Fast installs, strict dependency isolation, workspace protocol. The `pnpm-workspace.yaml` enforces supply-chain defenses (minimum 1-day release age for all packages).

**Why OpenAPI + Orval**: Single source of truth for API types. Zod schemas are generated from the spec, ensuring frontend and backend share the same validation rules.

### AI Scoring Pipeline

```
1. User enters store domain (+ optional admin token)
2. shopifyService fetches store data:
   a. Shopify Admin API (if token provided) → full data
   b. /products.json (fallback) → limited JSON
   c. HTML scraping (last resort) → synthetic products
3. scorerService prepares AI prompt:
   - Store metadata, product samples (up to 10)
   - Scraped metadata (OG tags, schema, headings)
   - API data (policies, metafields, blogs) if available
4. Groq API (Llama 3.3 70B) returns structured JSON:
   - 6 dimension scores with explanations
   - Per-product scores with issues
   - Top 7 gaps ranked by severity
5. Confidence calculation adjusts scores based on data quality
6. personaService runs 3 parallel persona simulations
7. temporalService detects data staleness
8. Response assembled and returned to frontend
```

### Shopify Data Fetching: Two-Tier with Fallback

**Tier 1 — Shopify Admin API** (requires token):
- `shop.json` → store name, email, currency
- `products.json?limit=250` → full product data with variants, images, metafields
- `policies.json` → shipping, refund, privacy policies
- `metafields.json?limit=50` → custom store metadata
- `blogs.json` + article fetch → blog content for freshness analysis

**Tier 2 — Public Scraping** (no token required):
- `products.json` → works for myshopify.com stores (30 products max)
- HTML scraping → extracts title, meta description, OG tags, schema.org JSON-LD, headings, price signals
- Synthetic products created from scraped text blocks

### Security: Shopify Admin Token Handling

Tokens are handled with a defense-in-depth approach:

1. **Never persisted** — Tokens live only in React state (component memory), never written to localStorage, cookies, or any storage
2. **Per-request transmission** — Tokens are sent in the request body for each API call, not stored server-side
3. **No server-side storage** — The backend does not cache or log tokens
4. **pino logger redaction** — Authorization headers and cookies are redacted from all log output
5. **Dynamic config endpoint** — `/api/config` returns `{ shopifyConfigured: false }` (token is always per-request, never server-configured)

### Error Handling

**Backend pattern**: Each route validates input with Zod, wraps async operations in try/catch, and returns structured error responses:

```typescript
const parsed = Schema.safeParse(req.body);
if (!parsed.success) {
  res.status(400).json({ error: "Invalid request", details: parsed.error.message });
  return;
}
```

**Partial failures**: `Promise.allSettled` is used for parallel data fetches (policies, metafields, blogs). Individual failures are non-fatal — missing data is surfaced as empty arrays.

**Frontend**: React Query mutation error handlers display user-friendly Alert components with descriptive messages.

## Failure Modes and Mitigations

| Failure | Impact | Mitigation |
|---|---|---|
| Groq API unavailable | Scoring fails, 500 error | Retry with exponential backoff (future) |
| Shopify store unreachable | No data, empty analysis | Fallback to scraping, reduced confidence |
| AI returns malformed JSON | Parsing error | String cleanup + JSON.parse with fallback |
| Frontend static files missing | Blank page | Express static middleware with error handler |
| Docker build fails | No deployment | Dockerfile uses node:22-slim (glibc), avoiding musl native module issues |

## Limitations

1. **No user accounts** — Analysis results are session-only. Refreshing the page loses data (by design for privacy).
2. **Rate limiting** — No rate limiting on API endpoints. In production, would add IP-based throttling.
3. **AI scoring variability** — LLM outputs have inherent non-determinism. Mitigated by temperature 0.3 and structured output constraints.
4. **Scraping accuracy** — HTML scraping produces synthetic products with estimated data. Results are less accurate than Admin API data.
5. **Single language** — All AI prompts and responses are in English. Non-English stores may get lower scores.
6. **No caching** — Every analysis hits the Groq API. Would add Redis caching in production.
7. **No database** — Results are ephemeral. Would add PostgreSQL for persistent analysis history.
8. **Frontend bundle size** — The React app includes all Radix UI components regardless of usage. Would add code splitting.

## Deployment

**Target**: Railway (single service)
**Method**: Dockerfile (`node:22-slim`)
**Healthcheck**: `/health` endpoint (30s timeout)
**Environment Variables**:
- `AI_API_KEY` (required) — Groq API key
- `AI_BASE_URL` (optional) — OpenAI-compatible endpoint
- `AI_MODEL` (optional) — AI model name
- `SHOPIFY_ADMIN_TOKEN` (optional) — Server-side token

## Build Process

```bash
pnpm install              # Install dependencies
pnpm run typecheck:libs   # TypeScript check shared libraries
pnpm -r --if-present run build  # Build api-server (esbuild) + mirrormind (vite)
pnpm start                # Start Express server (node artifacts/api-server/dist/index.mjs)
```

The Express server serves the React app from `artifacts/mirrormind/dist/public` — no separate web server needed.
