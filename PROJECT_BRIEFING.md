# Context Briefing: Skillable Access Control Policy Builder

## What Has Been Built

A production-quality, fully static web application called **Skillable Access Control Policy Builder**. It is a wizard-driven tool that enables Skillable lab authors to configure and generate Access Control Policies (ACPs) for Microsoft Azure and Amazon Web Services without manually writing policy JSON.

The application has been fully implemented, tested (25 passing unit tests), and deployed to GitHub Pages at:

```
https://bpp-sot.github.io/Access-Control-Policy-Builder/
```

Repository:

```
https://github.com/bpp-sot/Access-Control-Policy-Builder.git
```

Local development directory:

```
C:\Dev25\Policy Genertator
```

---

## Primary User Outcome

A non-specialist lab author can:

1. Select Microsoft Azure or Amazon Web Services
2. Describe the intended Skillable lab (metadata, learning outcomes, learner tasks, resource requirements)
3. Select the cloud services required by the learner
4. Select the operations the learner must perform (View, List, Create, Configure, Update, Start, Stop, Upload, Download, Delete, Tag, Monitor)
5. Configure regions, sizes, SKUs, resource names, and capacity limits
6. Configure identity, networking, deployment, and lifecycle requirements
7. Review the requested permissions
8. Generate a provider-appropriate Access Control Policy (Azure Policy definition or AWS IAM managed identity-based policy)
9. See a plain-English explanation of every generated statement
10. See warnings, unsupported combinations, and potential security risks
11. Copy the policy JSON to the clipboard
12. Download the policy as a formatted JSON file
13. Save and reload the application configuration as JSON (import/export)
14. Produce a security-review summary suitable for submission to Skillable
15. Trace generated statements back to official repository examples with evidence classifications

---

## Evidence Source

The application uses the official **LearnOnDemandSystems/labauthor** repository as its primary evidence source:

- Repository: https://github.com/LearnOnDemandSystems/labauthor
- Azure examples: `access-control-policies/Azure/` (10 policy folders)
- AWS examples: `access-control-policies/AWS/` (3 policy folders)
- Total: 13 official policy examples imported and normalised

A local copy was available at:

```
C:\Users\auto\Downloads\labauthor-master\labauthor-master\access-control-policies\
```

Every file was inventoried. For each file, the following metadata was recorded:

- Provider, repository-relative path, filename, policy title, purpose
- Cloud services represented, resource types represented
- Allowed/denied actions, conditions, regions, sizes/SKUs
- Resource scope, identity implications, network implications, cost controls
- Wildcard use, reusable patterns, dependencies, comments/documentation

### Evidence Classifications (A through G)

Every generated policy statement carries one of these classifications:

| Class | Label                                | Description                            |
| ----- | ------------------------------------ | -------------------------------------- |
| A     | Official Skillable sample            | From LearnOnDemandSystems/labauthor    |
| B     | Official Skillable documentation     | From docs.skillable.com                |
| C     | Native Microsoft Azure documentation | From docs.microsoft.com/azure          |
| D     | Native AWS documentation             | From docs.aws.amazon.com/IAM           |
| E     | Application safety constraint        | Added by this tool, not from Skillable |
| F     | User-supplied custom rule            | Provided by the user                   |
| G     | Unverified or requires manual review | No official evidence available         |

The interface allows the user to inspect why each statement was generated and trace it to its source. If a rule cannot be traced to evidence, it is NOT presented as an official Skillable rule.

### Key Rule: No Inference

The application does NOT invent Skillable-specific syntax, fields, conventions, or capabilities. Where the official repository or documentation does not establish a behaviour, that behaviour is labelled as unsupported, unverified, or requiring manual review (Classification G). General cloud-provider knowledge is NOT silently used to infer Skillable behaviour.

---

## Technology Stack

- **React 18** + **TypeScript** + **Vite 5**
- **React Router** using **HashRouter** (GitHub Pages-compatible — no 404 on refresh)
- **Vitest** + **React Testing Library** (unit tests — 25 tests passing)
- **Playwright** (end-to-end tests — 6 test specs)
- **ESLint** + **Prettier** (code quality)
- **GitHub Actions** (CI + GitHub Pages deployment)
- No server, no database, no authentication, no cloud credentials required
- All processing takes place in the browser
- Projects stored in browser localStorage; JSON import/export for portability

### GitHub Pages Configuration

- `VITE_BASE_PATH` env var controls the Vite `base` path
- Set to `/Access-Control-Policy-Builder/` in both CI and deploy workflows
- `.nojekyll` file created by deploy workflow to prevent Jekyll processing
- HashRouter ensures all routes work on refresh without 404 errors

---

## Application Architecture

### Information Architecture (8 primary areas)

1. **Home** — Hero landing page with feature overview and source attribution
2. **New Policy wizard** — 8-step guided wizard (detailed below)
3. **Policy projects** — Saved/imported project list with localStorage persistence
4. **Official example explorer** — Browse all 13 official ACP samples with full JSON
5. **Generated policy review** — Policy JSON, plain-English explanations, evidence tracing, warnings
6. **Security review summary** — Severity-rated security analysis suitable for Skillable submission
7. **Documentation and methodology** — Evidence standards, policy models, deployment behaviour, source info
8. **About and source version** — Source repository metadata, sync date, commit SHA, license notes

### Wizard Steps (8 steps)

**Step 1: Policy Project**

- Project name, lab profile name, lab profile number (e.g. CLD-AZR-SBX-001), author, version, description, programme, module, intended audience, lab duration, development/production status

**Step 2: Cloud Platform**

- Select Azure or AWS
- Explains that Azure ACPs use Azure Policy (deny-based whitelist model) and AWS ACPs use IAM managed identity-based policies (allow-based model)
- Warns that one-to-one conversion is NOT supported — the models are structurally different

**Step 3: Learning Purpose**

- Learning outcomes (multiple, add/remove)
- Learner tasks (multiple, add/remove)
- Supporting resources, resources created by learner, resources pre-deployed, resources modified, resources read-only, resources to delete
- Every requested permission should map to at least one learner task or supporting requirement

**Step 4: Deployment Behaviour**

- Deployment method: none, pre-entry (default), background, ARM template, Bicep, CloudFormation, other
- Lifecycle actions, validation scripts, cleanup scripts (checkboxes)
- Behaviour on deployment failure, lab save enabled/disabled
- Explains the documented Skillable distinction:
  - Pre-entry deployment: ACP applied AFTER deployment (no impact)
  - Background deployment: ACP active DURING deployment (must permit template operations or deployment fails)
- Shows prominent compatibility warning if background deployment is selected

**Step 5: Region and Location**

- Azure: approved Azure locations (32 regions), primary location, global resource types required
- AWS: approved AWS regions (29 regions), primary region, global services required
- For AWS: warns that IAM identity-based policies do not natively restrict regions like Azure Policy does — region control typically requires SCPs or VPC-level controls (flagged as unverified/manual review)

**Step 6: Services**

- Provider-specific service categories with searchable, filterable checkboxes
- Categories: Identity and access, Compute, Storage, Networking, Databases, Serverless, Application hosting, Containers, Monitoring and logging, Security, Data and analytics, AI and machine learning, Developer tools, Management and governance
- 15 Azure services + 12 AWS services in the catalogue
- Each service shows: official sample availability, risk category, cost sensitivity, identity sensitivity, network exposure sensitivity, notes
- Services without official samples are clearly flagged

**Step 7: Operations**

- For every selected service, choose operations (View, List, Create, Configure, Update, Start, Stop, Upload, Download, Delete, Tag, Monitor)
- For VM/EC2 services: select allowed SKUs/instance types (with warning if none selected)
- For Azure VMs/VMSS: configure allowed resource names (limits VM count — Skillable best practice)
- For Azure VMSS: configure max capacity (scale set instance limit)
- Operation-to-action mappings are flagged as Classification G (unverified) — no Skillable example demonstrates this mapping

**Step 8: Review**

- Configuration summary table
- Services detail table (operations, SKUs, names per service)
- Generate Policy button → creates the policy and navigates to the Review page

---

## Policy Generation Engine

### Azure Policy Generation

Located in: `src/lib/policy-generator.ts`

- Uses the **whitelist model** recommended by Skillable: encase allowed resources in a `not` block with `effect: "Deny"`
- For VMs: generates `allOf` conditions combining type, SKU (`Microsoft.Compute/virtualMachines/sku.name`), name, and location restrictions
- For VMSS: generates `allOf` conditions with type, SKU, name, capacity (`sku.capacity` with `lessOrEquals`), and location
- For non-VM services: generates `contains` conditions on the `type` field for each resource type
- Region restriction: uses `notIn` on `location` field plus `notEquals: "global"` if global resources are required
- If no services selected: generates a deny-all policy as a safety default
- Every statement includes: description, plain-English explanation, evidence reference (classification, source title, source path/URL, rationale, copied/parameterised/combined/application-generated, confidence), JSON fragment, warnings

### AWS IAM Policy Generation

- Uses the **allow + deny model** from official samples
- For each selected service: generates an `Allow` statement with wildcard action (e.g. `ec2:*`, `s3:*`) on `Resource: "*"`
- For EC2 with restricted instance types: generates a `Deny` statement on `ec2:RunInstances` with `Condition: { StringNotEquals: { "ec2:InstanceType": [...] } }`
- Policy format: `{ "Version": "2012-10-17", "Statement": [...] }`
- If no services selected: generates a deny-all statement (`Action: "*", Effect: "Deny"`)
- Region restrictions are flagged as unsupported in IAM identity-based policies (requires SCPs or VPC controls)

### Security Review Generation

Located in: `src/lib/security-review.ts`

- Generates a `SecurityReview` object with:
  - Overall risk assessment (low/medium/high/critical)
  - Security items with severity (critical/high/medium/low/info), category, description, recommendation
  - Summary text suitable for submission to Skillable
- Checks for:
  - Missing VM SKU/instance type restrictions (high severity)
  - Missing VM name restrictions on Azure (medium severity)
  - Wildcard permission usage (high severity)
  - Background deployment compatibility (high severity)
  - Services without official samples (medium severity)
  - Unverified statements / Classification G count (medium severity)
  - Unsupported combinations (medium severity)
  - Custom JSON (medium severity)
  - No services selected (low severity)
- Output is downloadable as a text file and copyable to clipboard

---

## Data Files

All normalised data is committed to the repository in `src/data/`:

| File                     | Contents                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `source-manifest.json`   | Source repository metadata, sync date, commit SHA, import counts, manual mappings, evidence source definitions                  |
| `azure-patterns.json`    | 10 Azure policy patterns with full JSON, structure notes, applicability, GitHub URLs, best practices                            |
| `aws-patterns.json`      | 3 AWS policy patterns with full JSON, structure notes, applicability, GitHub URLs, best practices                               |
| `service-catalogue.json` | 15 Azure + 12 AWS services with categories, resource types, risk profiles, official sample references, 12 operation definitions |
| `evidence-index.json`    | 26 evidence entries across all 7 classifications (A-G) with source titles, paths, URLs, rationales, confidence levels           |
| `regions-skus.json`      | 32 Azure locations, 29 AWS regions, 12 Azure VM SKUs, 10 AWS instance types                                                     |

### Sync Script

`npm run sync:policies` runs `scripts/sync-policies.ts` which:

1. Reads from a local clone of LearnOnDemandSystems/labauthor (or a specified `--source` path)
2. Inventories all files under `access-control-policies/Azure` and `access-control-policies/AWS`
3. Parses policy JSON (handles trailing commas and comments in sample JSON)
4. Preserves non-JSON source material as evidence metadata
5. Generates normalised `.synced.json` files for review
6. Produces a machine-readable `sync-report.json`
7. Reports parsing errors without silently omitting files

---

## Key Files and Directories

```
C:\Dev25\Policy Genertator\
├── .github/workflows/
│   ├── ci.yml                          # CI: lint, typecheck, test, build
│   └── deploy.yml                      # Deploy: build + GitHub Pages
├── e2e/
│   └── app.spec.ts                     # 6 Playwright e2e tests
├── public/
│   └── favicon.svg                     # Shield icon with gradient
├── scripts/
│   └── sync-policies.ts                # Policy sync/normalisation script
├── src/
│   ├── components/
│   │   └── WizardSteps.tsx             # All 8 wizard step components
│   ├── data/                           # Normalised evidence data (6 JSON files)
│   ├── lib/
│   │   ├── download.ts                 # Clipboard + file download utilities
│   │   ├── policy-generator.ts         # Core Azure + AWS policy generation engine
│   │   ├── policy-generator.test.ts    # 12 unit tests
│   │   ├── secret-detector.ts          # Detects credentials in free-text fields
│   │   ├── secret-detector.test.ts     # 7 unit tests
│   │   ├── security-review.ts          # Security review generation
│   │   ├── security-review.test.ts     # 6 unit tests
│   │   ├── storage.ts                  # localStorage project persistence + import/export
│   │   ├── theme.tsx                   # Light/dark mode context provider
│   │   └── wizard-context.tsx          # Wizard state context provider
│   ├── pages/
│   │   ├── About.tsx                   # Source version, attribution, privacy
│   │   ├── Docs.tsx                    # Evidence standards, policy models, methodology
│   │   ├── Explorer.tsx                # Official example browser (Azure/AWS tabs)
│   │   ├── Home.tsx                    # Hero landing page
│   │   ├── NewPolicy.tsx               # 8-step wizard orchestrator
│   │   ├── Projects.tsx                # Saved projects list + import/export
│   │   ├── Review.tsx                  # Generated policy review with JSON, explanations, evidence
│   │   └── SecurityReviewPage.tsx      # Security review summary with severity ratings
│   ├── test/setup.ts                   # Vitest setup
│   ├── types/index.ts                  # All TypeScript type definitions
│   ├── App.tsx                         # Root component with routing + nav + footer
│   ├── index.css                       # Full CSS with light/dark theme variables
│   ├── main.tsx                        # Entry point (HashRouter + ThemeProvider)
│   └── vite-env.d.ts                   # Vite client types
├── AGENTS.md                           # Project guide for AI agents
├── CONTRIBUTING.md                     # Contribution guidelines
├── LICENSE                             # License guidance
├── README.md                           # Full documentation
├── SECURITY.md                         # Security policy
├── eslint.config.js                    # ESLint flat config
├── index.html                          # HTML entry point
├── package.json                        # Dependencies and scripts
├── playwright.config.ts                # Playwright configuration
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json  # TypeScript configs
├── vite.config.ts                      # Vite config with base path + aliases
└── vitest.config.ts                    # Vitest config with jsdom
```

---

## UI/UX Design

- **Modern, stunning interface** with light and dark mode
- Theme toggle in header (sun/moon icon), persists to localStorage, respects system preference on first load
- CSS custom properties for all colours, shadows, radii — smooth theme transitions
- Responsive: works on mobile (768px breakpoint), tablet, and desktop
- Gradient hero section with feature cards
- Wizard progress indicator with step circles, labels, and connectors
- Searchable, filterable service selection with risk badges
- Code blocks with monospace font for policy JSON display
- Evidence badges with colour-coded classifications (A=green, B/C=blue, D=orange, E=purple, F/G=red)
- Alert components (info, warning, danger, success) for warnings and security risks
- Tag pills for resource names, badge pills for metadata
- Empty states with icons and guidance
- Tab bars for Azure/AWS switching in the explorer

---

## Secret Detection

The application includes a secret detector (`src/lib/secret-detector.ts`) that checks all free-text fields for:

- AWS Access Key IDs (AKIA pattern)
- Private key blocks
- JWT tokens
- Password/secret/token/API key assignments
- Connection strings (Azure Storage, general)
- Client secrets
- SAS token references

If detected, the user is alerted and the input is blocked. The application NEVER stores secrets, credentials, passwords, access keys, or temporary access passes.

---

## Warnings and Safety Features

The application displays clear warnings when a generated policy contains:

- Custom JSON
- Unverified behaviour (Classification G)
- Broad wildcard permissions (e.g. `ec2:*`, `s3:*`, `*`)
- Provider-native constructs not demonstrated by a Skillable example
- Combinations that have not been validated against official examples
- Missing VM SKU restrictions (security risk)
- Missing VM name restrictions (security risk)
- Background deployment without template operation exceptions
- AWS region restrictions (unsupported in IAM identity-based policies)

---

## Build and Verification Commands

```bash
npm run dev              # Start Vite dev server (http://localhost:5173)
npm run build            # TypeScript build + Vite production build
npm run preview          # Preview production build
npm run typecheck        # TypeScript type checking only
npm run lint             # ESLint
npm run format           # Prettier format
npm run format:check     # Prettier check
npm run test             # Vitest unit tests (25 tests)
npm run test:e2e         # Playwright e2e tests (6 specs)
npm run sync:policies    # Sync policy examples from labauthor repo
```

### Windows Note

On Windows with restricted PowerShell execution policy, use `cmd /c npm <command>` instead of `npm <command>` directly in PowerShell.

---

## Current State

- All code is committed and pushed to `https://github.com/bpp-sot/Access-Control-Policy-Builder.git`
- The deploy workflow triggers on push to `main` and deploys to GitHub Pages
- `VITE_BASE_PATH` is set to `/Access-Control-Policy-Builder/`
- 25 unit tests pass, lint passes, format passes, build passes
- The application is live (or deploying) at `https://bpp-sot.github.io/Access-Control-Policy-Builder/`
- GitHub Pages Source must be set to "GitHub Actions" in repository Settings > Pages

---

## What is NOT Included (Intentional)

- No one-to-one Azure ↔ AWS policy conversion (the models are fundamentally different)
- No inference of Skillable behaviour from general cloud knowledge
- No runtime GitHub API calls or scraping from the user's browser
- No server-side processing, databases, authentication, or paid services
- No environment secrets or cloud credentials required
- No analytics, tracking, or telemetry
- No storage of secrets or credentials
