# Skillable Access Control Policy Builder — Project Guide

## Build & Verification Commands

```bash
npm run typecheck     # TypeScript type checking
npm run lint          # ESLint
npm run format:check  # Prettier format check
npm run test          # Unit tests (Vitest, 25 tests)
npm run build         # Production build (typecheck + vite build)
npm run test:e2e      # End-to-end tests (Playwright)
npm run sync:policies # Sync policy examples from labauthor repo
```

## Architecture

- **Static SPA**: React + TypeScript + Vite, deployed to GitHub Pages
- **Routing**: HashRouter (avoids 404 on GitHub Pages refresh)
- **State**: localStorage for project persistence; React context for wizard state
- **No backend**: All processing in the browser

## Key Directories

- `src/data/` — Normalised evidence data (azure-patterns, aws-patterns, service-catalogue, evidence-index, source-manifest)
- `src/lib/` — Core logic (policy-generator, security-review, storage, theme, secret-detector, download)
- `src/components/` — Reusable UI components (WizardSteps)
- `src/pages/` — Route pages (Home, NewPolicy, Projects, Explorer, Review, SecurityReviewPage, Docs, About)
- `scripts/` — Development scripts (sync-policies)
- `e2e/` — Playwright end-to-end tests

## Evidence Model

Every generated policy statement has an evidence classification (A-G):

- A: Official Skillable sample
- B: Official Skillable documentation
- C: Native Azure documentation
- D: Native AWS documentation
- E: Application safety constraint
- F: User-supplied custom rule
- G: Unverified / requires manual review

## GitHub Pages Base Path

Configured via `VITE_BASE_PATH` env var. Set in `.github/workflows/deploy.yml`.
Default: `/` (local dev). Production: `/skillable-acp-builder/`.

## PowerShell Note

On Windows with restricted execution policy, use `cmd /c npm <command>` instead of `npm <command>` directly in PowerShell.
