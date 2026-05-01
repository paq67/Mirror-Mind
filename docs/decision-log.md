# Decision Log

Key architectural and product decisions made during MirrorMind development.

---

## 1. Single-Service Deployment

**Considered**: Separate frontend (Netlify/Vercel) + backend (Railway/Render) vs. single service (Railway)

**Chose**: Single service on Railway where Express serves both the API and the React frontend.

**Because**:
- AI analysis endpoints (`/api/analyze`, `/api/simulate`) can take 10–20 seconds — serverless platforms (Netlify Functions, Vercel Edge) timeout at 10–15s
- Eliminates CORS complexity — frontend and backend share the same origin
- Simpler deployment pipeline — one push, one build, one deploy
- No separate domain configuration needed

---

## 2. AI Provider: Groq over OpenAI

**Considered**: OpenAI (GPT-4), Anthropic (Claude), Groq (Llama 3.3)

**Chose**: Groq with Llama 3.3 70B Versatile.

**Because**:
- Inference speed: 10x faster than GPT-4, critical for user experience during analysis
- Cost: dramatically cheaper per API call — a full analysis (scoring + 3 personas + fix plan) costs cents instead of dollars
- Quality sufficient: for structured scoring tasks with clear evaluation criteria, Llama 3.3 performs comparably to GPT-4
- OpenAI-compatible API: easy to swap providers later if needed

---

## 3. Shopify Token: Session-Only, No Persistence

**Considered**: Store tokens in backend database, localStorage, or pass per-request

**Chose**: Pass per-request, store only in React component state, never persist anywhere.

**Because**:
- Security: Shopify Admin API tokens are highly sensitive (full store access). Any storage creates liability
- Trust: users are reluctant to enter tokens if they don't know where they're stored
- Privacy: session-only means no token leaks if the database is compromised (because there is no database)
- Tradeoff accepted: users must re-enter tokens each session, but most users won't have tokens at all

---

## 4. Scraping Fallback Strategy

**Considered**: Require Shopify token for all analysis vs. allow public data access

**Chose**: Three-tier fallback: Admin API → products.json → HTML scraping.

**Because**:
- Most users won't have admin tokens — the tool must still work without them
- Public data (`/products.json`) works for myshopify.com stores without authentication
- HTML scraping extracts meaningful signals (OG tags, schema, headings) even without structured access
- Confidence scores reflect data quality — users know when results are lower-confidence

---

## 5. Express 5 (not Express 4)

**Considered**: Express 4 (stable, well-documented) vs. Express 5 (newer, breaking changes)

**Chose**: Express 5.

**Because**:
- Future-proof: Express 4 is EOL, Express 5 is the path forward
- Better routing syntax (path-to-regexp v8)
- Tradeoff: required adjusting catch-all route from `"*"` to `"/{*path}"` — a breaking change in Express 5's router syntax

---

## 6. pnpm Workspaces (not npm/yarn)

**Considered**: npm workspaces, yarn workspaces, pnpm workspaces

**Chose**: pnpm with workspaces.

**Because**:
- Strict dependency isolation prevents accidental cross-package imports
- `pnpm-workspace.yaml` supports supply-chain defense settings (minimum release age enforcement)
- Faster installs with content-addressable store
- Platform-specific native binary overrides for smaller deployment images

---

## 7. No Database

**Considered**: PostgreSQL with Drizzle ORM vs. no database (session-only)

**Chose**: No database. Analysis results are session-only.

**Because**:
- Privacy-first: store analysis data never leaves the user's session
- Simpler deployment: no database provisioning, migrations, or connection pooling
- Hackathon scope: database layer would add complexity without improving the demo
- Tradeoff: no analysis history, no user accounts, no data aggregation

---

## 8. Dockerfile over Nixpacks for Railway

**Considered**: Railway's default nixpacks builder vs. custom Dockerfile

**Chose**: Custom Dockerfile with `node:22-slim`.

**Because**:
- Full control over Node.js and pnpm versions
- Avoids nixpacks platform detection issues with pnpm workspace overrides
- Consistent builds across environments
- Alpine Linux was initially chosen but rejected — musl libc conflicts with pnpm's native binary overrides (rollup, esbuild). Switched to Debian-based slim.

---

## 9. Zod Schemas Generated from OpenAPI Spec

**Considered**: Manually write Zod schemas vs. generate from OpenAPI spec via Orval

**Chose**: OpenAPI spec as source of truth, Zod schemas generated via Orval.

**Because**:
- Single source of truth — API contract is defined once, types are derived
- Frontend and backend share identical validation rules
- React Query hooks can also be generated from the same spec
- Tradeoff: Orval setup adds initial complexity, but pays off as the API grows

---

## 10. wouter over React Router

**Considered**: React Router v6+ vs. wouter

**Chose**: wouter (lightweight router).

**Because**:
- Smaller bundle size (~1KB vs. ~30KB for React Router)
- Simpler API — only need basic routing (home, dashboard, simulate, compare, fix)
- No nested route complexity needed
- Works seamlessly with Vite and the SPA catch-all pattern

---

## 11. 6-Dimension Scoring with AI

**Considered**: Rule-based scoring (count meta tags, check schema presence) vs. AI-powered scoring

**Chose**: AI-powered scoring using LLM analysis.

**Because**:
- Rule-based scoring is too rigid — it can't understand context (e.g., a short description might be fine for a fashion brand, terrible for technical equipment)
- LLMs can evaluate quality, not just presence/absence
- Can produce explanations, not just numbers — users understand *why* their score is what it is
- Tradeoff: slower (LLM call latency), less deterministic, higher cost per analysis

---

## 12. Temperature Settings

**Considered**: Single temperature vs. different temperatures per task

**Chose**: Different temperatures for different tasks:
- Scoring: 0.3 (conservative, deterministic)
- Personas: 0.4 (slightly creative, distinct voices)
- Temporal drift: 0.2 (very conservative, factual)

**Because**: Scoring needs consistency across runs. Personas need distinct voices to feel different. Temporal detection is a factual analysis — creativity would introduce hallucination risk.
