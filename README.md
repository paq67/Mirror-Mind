# MirrorMind

> **AI Representation Optimizer** — See your store through AI eyes.

MirrorMind is a web application that helps Shopify store owners understand how AI shopping agents (ChatGPT Shopping, Perplexity, Google Shopping AI) perceive their stores, and provides actionable fixes to improve visibility in AI-driven recommendations.

## The Problem

AI shopping agents are becoming a primary discovery channel for online shoppers. But unlike traditional search engines that index keywords, AI agents *reason* about products — they read descriptions, evaluate trust signals, parse structured data, and synthesize recommendations. Most Shopify stores are completely invisible to these agents because they were optimized for Google, not for AI.

## The Solution

MirrorMind analyzes any Shopify store across 6 dimensions that matter to AI shopping agents, simulates how 3 different AI personas would evaluate the store, compares against competitors, and generates a ranked fix plan — all in under 30 seconds.

## Features

- **6-Dimension AI Readiness Score** — Product descriptions, SEO, trust signals, reviews, structured data, content freshness
- **3 AI Persona Simulations** — Deal Hunter, Trust Verifier, Lifestyle Matcher
- **Competitor Comparison** — Score your store against up to 3 competitors
- **Actionable Fix Plan** — Ranked by effort vs. impact with quick wins highlighted
- **Temporal Drift Detection** — Detects if store data is stale or outdated
- **Enhanced Shopify Analysis** — Optional Admin API token unlocks full product data, policies, and metafields

## Screenshots

### Home Page
![Home Page](docs/screenshots/home.png)

*Enter any Shopify store URL to begin analysis. No API token required for basic analysis.*

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

*Overall AI representation score with 6-dimension breakdown, persona results, and top product scores.*

### AI Persona Simulation
![Simulation](docs/screenshots/simulate.png)

*See exactly what ChatGPT Shopping, Perplexity, or Google Shopping AI would say about your store.*

### Competitor Comparison
![Compare](docs/screenshots/compare.png)

*Side-by-side dimension comparison with competitors and ranked opportunities.*

### Fix Plan
![Fix Plan](docs/screenshots/fix.png)

*Prioritized action items with quick wins, effort/impact matrix, and estimated score gains.*

## Quick Start

```bash
pnpm install
pnpm build
pnpm start
```

The app runs at `http://localhost:3000` — Express serves both the API and the React frontend.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AI_API_KEY` | Yes | Groq API key (or any OpenAI-compatible provider) |
| `AI_BASE_URL` | No | Defaults to Groq endpoint |
| `AI_MODEL` | No | Defaults to `llama-3.3-70b-versatile` |
| `SHOPIFY_ADMIN_TOKEN` | No | Server-side Shopify Admin API token (optional, per-request tokens override) |

### Architecture

```
Mirror-Mind/                          # pnpm monorepo
├── artifacts/
│   ├── api-server/                   # Express 5 backend (API + static serving)
│   │   └── src/
│   │       ├── routes/               # /api/analyze, /simulate, /compare, /fix
│   │       ├── services/             # shopifyService, scorerService, personaService, fixService
│   │       └── app.ts                # Express app, SPA catch-all
│   └── mirrormind/                   # React 19 + Vite frontend
│       └── src/
│           ├── pages/                # Home, Dashboard, Simulate, Compare, Fix
│           └── lib/api-client/       # Generated API client + React Query hooks
├── lib/
│   ├── api-zod/                      # Shared Zod schemas (generated from OpenAPI)
│   └── api-spec/                     # OpenAPI spec + Orval codegen
└── docs/                             # Product, technical, and decision documentation
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS 4, Radix UI, Recharts, Framer Motion
- **Backend**: Express 5, TypeScript, esbuild, Pino logger
- **AI**: Groq (llama-3.3-70b-versatile), OpenAI-compatible API
- **Validation**: Zod schemas with OpenAPI spec + Orval codegen
- **Deployment**: Docker (node:22-slim), Railway
- **Package Manager**: pnpm workspaces with supply-chain defenses (minimum release age enforcement)

## Credits

- Built by [paq67](https://github.com/paq67)
- Hackathon submission — Track 5: Advanced AI
- AI assistance used for git workflow, deployment configuration, and backend security patterns only. The application concept, architecture, UI design, and all scoring/analysis logic are original work.
