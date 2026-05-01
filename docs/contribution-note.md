# Contribution Note

## Solo Developer

MirrorMind was conceived, designed, and built entirely by me ([paq67](https://github.com/paq67)) — from the initial idea through architecture, UI design, frontend development, backend services, deployment configuration, and documentation.

## Time Split

Approximate time allocation across the project:

| Activity | Percentage | Details |
|---|---|---|
| **Product Thinking** | 20% | Identifying the problem (AI agents can't read Shopify stores), defining the 6 scoring dimensions, designing the 3 AI personas, prioritizing features for hackathon scope |
| **UI/UX Design** | 15% | Component library selection (Radix UI + Tailwind CSS), page layouts, visual hierarchy, the entropy background animation, responsive design |
| **Frontend Development** | 25% | React pages (Home, Dashboard, Simulate, Compare, Fix), state management (React Context), API client integration, error handling, form validation |
| **Backend Development** | 25% | Express routes, Shopify data fetching service, AI scoring pipeline, persona simulation, fix plan generation, temporal drift detection, logging |
| **Architecture & DevOps** | 15% | Monorepo setup (pnpm workspaces), OpenAPI spec + Orval codegen, Dockerfile configuration, Railway deployment, CI/CD |

## AI Assistance Used

I used AI tools (ChatGPT, Claude, and opencode) for specific tasks only. The application concept, architecture, UI design, business logic, scoring algorithms, and all creative decisions are my own.

**AI was used for:**

- **Git workflow** — resolving merge conflicts, commit message formatting, branch management
- **Deployment configuration** — Dockerfile setup, Railway builder selection (nixpacks → Dockerfile), platform compatibility issues (Alpine musl vs. Debian glibc)
- **Backend security patterns** — Shopify Admin token handling strategy (session-only, no persistence), pino logger redaction configuration
- **TypeScript debugging** — fixing type errors in Express 5 route syntax (`"*"` → `"/{*path}"`), resolving module reference issues after package deletions
- **Repo cleanup** — identifying unused workspace packages, dead dependencies, and orphaned directories

**AI was NOT used for:**

- The application concept or problem definition
- The 6-dimension scoring framework or weight assignments
- The 3 AI persona definitions and system prompts
- UI/UX design decisions (component selection, layout, color scheme)
- The Shopify data fetching logic or scraping fallback strategy
- The OpenAPI spec or Zod schema definitions
- Any business logic, scoring algorithms, or fix plan generation

## Development Environment

The project was initially scaffolded in Replit (node_modules and Replit-specific configs were present in the original repository). I subsequently:

1. Removed all Replit-specific configuration (`.replit`, `.replitignore`, `.replit-artifact/` folders)
2. Migrated deployment to Railway with a custom Dockerfile
3. Cleaned the workspace to remove all dead packages and unused dependencies
4. Retained all original application code and logic

The Replit environment was used as a development sandbox. All decisions about what to keep, remove, or modify were mine.
