# MirrorMind — AI Representation Optimizer

## Overview

MirrorMind shows Shopify store owners exactly how AI shopping agents (ChatGPT Shopping, Perplexity, Google Shopping AI) perceive their store — and gives them a ranked, actionable plan to improve their AI representation before they lose recommendations and revenue.

Built for Hackathon Track 5 (Advanced): AI Representation Optimizer.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/mirrormind)
- **API framework**: Express 5 (artifacts/api-server)
- **AI**: Groq LLM via OpenAI-compatible API (llama-3.3-70b-versatile)
- **Database**: PostgreSQL + Drizzle ORM
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Architecture

### Frontend (artifacts/mirrormind)
- Pages: `/` (Home/Analysis entry), `/dashboard`, `/simulate`, `/compare`, `/fix`
- State: React Context (`StoreProvider`) with localStorage persistence for storeDomain, adminToken, analysisData
- API hooks from `@workspace/api-client-react` (Orval-generated)

### Backend (artifacts/api-server/src/routes)
- `POST /api/analyze` — Fetch Shopify store data + AI score (6 dimensions)
- `POST /api/simulate` — Simulate ChatGPT/Perplexity/Google persona response
- `POST /api/compare` — Compare store vs. competitor domains
- `POST /api/fix` — Generate ranked fix plan with effort/impact matrix

### Services (artifacts/api-server/src/services)
- `aiClient.ts` — Groq LLM wrapper via OpenAI SDK
- `shopifyService.ts` — Shopify API + storefront scraping fallback
- `scorerService.ts` — AI-powered 6-dimension scoring engine

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Required Secrets

- `AI_API_KEY` — Groq API key (get free at console.groq.com)
- `AI_BASE_URL` — defaults to https://api.groq.com/openai/v1 (optional)
- `AI_MODEL` — defaults to llama-3.3-70b-versatile (optional)
- `DATABASE_URL` — PostgreSQL connection string (provided by Replit)

## User-provided at Runtime (NOT stored as secrets)
- `SHOPIFY_STORE_DOMAIN` — entered in the UI
- `SHOPIFY_ADMIN_TOKEN` — entered in the UI (optional, for deeper analysis)
