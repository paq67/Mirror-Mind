# MirrorMind — Product Document

## What Was Built

MirrorMind is an **AI Representation Optimizer** for Shopify store owners. It analyzes how AI shopping agents (ChatGPT Shopping, Perplexity, Google Shopping AI) perceive a given store, produces a quantified score across 6 dimensions, simulates 3 distinct AI personas, compares against competitors, and generates a prioritized fix plan.

All of this runs in a single analysis session that typically completes in 10–20 seconds.

## Target Audience

**Primary**: Shopify store owners and e-commerce managers who want their stores to be discoverable by AI shopping agents.

**Secondary**: E-commerce agencies and consultants who advise clients on AI optimization.

**Context**: The tool was built for a hackathon submission (Track 5: Advanced AI), targeting a market that doesn't yet fully understand that AI agents are becoming a primary product discovery channel.

## Why This Matters

Traditional SEO optimizes for search engine crawlers that index keywords and links. AI shopping agents do something fundamentally different — they *read and reason* about stores the way a human would. They evaluate:

- Whether product descriptions are detailed enough to understand what's being sold
- Whether trust signals (reviews, policies, contact info) are present and credible
- Whether structured data (schema.org) makes products machine-readable
- Whether the store has recent, fresh content

A store that ranks #1 on Google might be completely invisible to ChatGPT Shopping because its descriptions are thin, it has no schema markup, and there are no reviews the AI can cite. MirrorMind makes this gap visible and actionable.

## Key Features

### 1. Store Analysis (6 Dimensions)
Every store is scored on:
- **Product Descriptions** (25% weight) — Detail, benefit-focus, LLM-parseability
- **SEO & Discoverability** (20%) — Title tags, meta descriptions, AI query matching
- **Trust Signals** (20%) — Brand credibility, policies, social proof
- **Review Coverage** (15%) — Review presence in schema.org markup
- **Structured Data** (10%) — Schema.org JSON-LD presence
- **Content Freshness** (10%) — Recent content, regular updates

### 2. AI Persona Simulations
Three distinct shopping personas evaluate the store:
- **Deal Hunter** — Value-focused, skeptical without clear pricing and shipping info
- **Trust Verifier** — Policy-focused, refuses to recommend stores without clear trust signals
- **Lifestyle Matcher** — Identity-focused, needs brand story and aesthetic coherence

### 3. Competitor Comparison
Users can add up to 3 competitor domains and see side-by-side dimension comparisons with ranked opportunities.

### 4. Fix Plan Generation
A ranked, actionable plan to improve AI representation, organized by:
- Quick wins (low effort, high impact)
- Effort vs. impact matrix
- Estimated score gains per fix

## Scope Decisions

### In Scope
- Single-store analysis with domain-based input
- Optional Shopify Admin API token for enhanced data (policies, metafields, blogs)
- Fallback to public scraping when no token is provided
- Three AI personas with distinct evaluation criteria
- Competitor comparison for up to 3 stores
- Fix plan generation with prioritization
- Temporal drift detection (is the store data stale?)

### Out of Scope (Intentional)
- User accounts / authentication — friction would reduce hackathon demo value
- Database persistence — analysis is single-session; data lives in React state
- Automated fixes — the tool identifies gaps; store owners implement them manually
- Multi-language support — English-only for hackathon
- Mobile-native app — responsive web only

## Tradeoffs

### Token Handling: Session-Only, No Persistence
**Decision**: Shopify Admin API tokens are passed per-request, stored only in React state, never persisted to localStorage or any backend storage.

**Why**: Security-first approach. Store owners are rightfully paranoid about their admin tokens. Persisting them creates liability and trust barriers.

**Cost**: Users must re-enter tokens for each session. Acceptable because most users won't have tokens at all — the tool works without them.

### AI Scoring: Groq + Llama 3.3
**Decision**: Use Groq's Llama 3.3 70B model instead of OpenAI's GPT-4.

**Why**: 10x faster inference, dramatically lower cost per analysis, sufficient reasoning quality for scoring tasks.

**Cost**: Slightly less nuanced than GPT-4 for edge cases. Mitigated by temperature 0.3 (conservative) and structured JSON-only output.

### Scraping Fallback
**Decision**: When no Shopify token is provided, fall back to public data (products.json, HTML scraping).

**Why**: Most users won't have admin tokens. The tool must still produce useful results.

**Cost**: Scrape-only results have lower confidence scores and less data depth. This is surfaced transparently via confidence scores and explanations.

## Technical Debt (Known)

- No automated tests — would add test coverage in production
- Error boundaries in React are basic — should add proper error boundary components
- AI scoring results are not cached — repeated analyses of the same store hit the API every time
- Frontend API client is manually maintained rather than using the generated Orval client
