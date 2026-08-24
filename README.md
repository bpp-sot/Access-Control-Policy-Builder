# Skillable Access Control Policy Builder

A wizard-driven static web application that enables Skillable lab authors to configure and generate Access Control Policies for Microsoft Azure and Amazon Web Services without manually writing policy JSON.

## Features

- **Wizard-driven UI**: 8-step guided wizard for non-specialist lab authors
- **Azure & AWS support**: Generates Azure Policy definitions or AWS IAM managed identity-based policies
- **Evidence-traced**: Every generated statement traces back to official Skillable samples from the [LearnOnDemandSystems/labauthor](https://github.com/LearnOnDemandSystems/labauthor) repository
- **Security review**: Automatic security analysis with severity ratings, suitable for submission to Skillable
- **Official example explorer**: Browse all 13 official Skillable ACP samples with full JSON and notes
- **Light & dark mode**: Modern responsive UI with theme toggle
- **Local storage**: Projects saved in browser localStorage; export/import as JSON
- **No backend**: Fully static, deployable to GitHub Pages

## Technology Stack

- React + TypeScript + Vite
- React Router (HashRouter for GitHub Pages compatibility)
- Vitest + React Testing Library (unit tests)
- Playwright (end-to-end tests)
- ESLint + Prettier
- GitHub Actions (CI + GitHub Pages deployment)

## Getting Started

### Prerequisites

- Node.js 22+ (see `.nvmrc`)
- npm 10+

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build

```bash
npm run build
```

The built files will be in `dist/`.

### Preview Production Build

```bash
npm run preview
```

## Scripts

| Script                  | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | Start Vite dev server                          |
| `npm run build`         | Typecheck + production build                   |
| `npm run preview`       | Preview the production build                   |
| `npm run lint`          | Run ESLint                                     |
| `npm run format`        | Format code with Prettier                      |
| `npm run format:check`  | Check code formatting                          |
| `npm run typecheck`     | Run TypeScript type checking                   |
| `npm run test`          | Run unit tests (Vitest)                        |
| `npm run test:e2e`      | Run end-to-end tests (Playwright)              |
| `npm run sync:policies` | Sync policy examples from labauthor repository |

## Syncing Policy Examples

The application uses normalised data derived from the official [LearnOnDemandSystems/labauthor](https://github.com/LearnOnDemandSystems/labauthor) repository. To re-sync:

```bash
npm run sync:policies -- --source /path/to/labauthor
```

This will:

1. Inventory all files under `access-control-policies/Azure` and `access-control-policies/AWS`
2. Parse policy JSON files
3. Generate normalised data files
4. Produce a machine-readable sync report (`sync-report.json`)

The curated data files in `src/data/` contain hand-annotated metadata. The sync script generates `.synced.json` files for review.

## Deployment to GitHub Pages

1. Push your code to a GitHub repository (e.g. `your-org/skillable-acp-builder`)
2. Update `VITE_BASE_PATH` in `.github/workflows/deploy.yml` to match your repository name:
   ```yaml
   VITE_BASE_PATH: /skillable-acp-builder/
   ```
3. Enable GitHub Pages in your repository settings (Settings > Pages > Source: GitHub Actions)
4. Push to `main` or `master` — the deploy workflow will build and deploy automatically

The application uses `HashRouter` to avoid 404 errors on GitHub Pages route refreshes.

## Evidence Standard

Every generated policy rule is classified according to one of these evidence classifications:

| Class | Label                                | Description                         |
| ----- | ------------------------------------ | ----------------------------------- |
| A     | Official Skillable sample            | From LearnOnDemandSystems/labauthor |
| B     | Official Skillable documentation     | From docs.skillable.com             |
| C     | Native Microsoft Azure documentation | From docs.microsoft.com/azure       |
| D     | Native AWS documentation             | From docs.aws.amazon.com/IAM        |
| E     | Application safety constraint        | Added by this tool                  |
| F     | User-supplied custom rule            | Provided by the user                |
| G     | Unverified or requires manual review | No official evidence available      |

## Source Version

- **Repository**: LearnOnDemandSystems/labauthor
- **Commit**: master-snapshot-2026-08-24
- **Sync Date**: 2026-08-24
- **Azure Examples**: 10
- **AWS Examples**: 3

## License

The source repository (LearnOnDemandSystems/labauthor) does not include a LICENSE file. This application preserves attribution and does not redistribute raw policy JSON beyond what is necessary for normalised metadata. See `SECURITY.md` and `CONTRIBUTING.md` for additional information.
