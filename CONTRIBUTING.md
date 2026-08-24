# Contributing to Skillable Access Control Policy Builder

Thank you for your interest in contributing! This document outlines the process for contributing to this project.

## Development Setup

1. Clone the repository
2. Install Node.js 22+ and run `npm install`
3. Run `npm run dev` to start the development server

## Code Style

- TypeScript with strict mode
- Prettier for formatting (run `npm run format`)
- ESLint for linting (run `npm run lint`)
- All code must pass `npm run typecheck`, `npm run lint`, and `npm run test` before submission

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all checks pass:
   ```bash
   npm run typecheck
   npm run lint
   npm run format:check
   npm run test
   npm run build
   ```
4. Create a pull request with a clear description of the changes

## Evidence Standards

When adding or modifying policy generation logic:

- Every generated statement must have an evidence classification (A through G)
- Statements classified as A (Official Skillable sample) must trace to a specific file in the LearnOnDemandSystems/labauthor repository
- Do not infer Skillable behaviour from general cloud-provider knowledge
- Label unverified behaviours as Classification G (Unverified or requires manual review)
- Display warnings for custom JSON, unverified behaviour, broad wildcard permissions, and unvalidated combinations

## Syncing Policy Examples

If you need to update the normalised policy data from the source repository:

```bash
npm run sync:policies -- --source /path/to/labauthor
```

Review the generated `.synced.json` files and update the curated data files in `src/data/` with appropriate metadata.
