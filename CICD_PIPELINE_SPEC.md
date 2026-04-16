# CI/CD Pipeline Spec (MVP-Calibrated)

> **Purpose.** This file is a **contract and checklist** for the CI/CD pipeline in this repo. It is stack-agnostic — it works for Next.js, SvelteKit, Python services, Go controllers, Flutter apps, or containerized workloads. Claude Code should read this file before creating or modifying any pipeline config (`.github/workflows/*.yml`, `.gitlab-ci.yml`, `vercel.json`, `Dockerfile`, etc.) and use it as the **acceptance criteria** for what "done" looks like.
>
> **How to use this file:**
> 1. **Greenfield repo** → Claude Code should scaffold the pipeline to satisfy every **MUST** in this spec.
> 2. **Existing repo** → Claude Code should audit the current pipeline against this spec and produce a gap report before making changes.
> 3. **PR review** → Reviewers (human or AI) can use the checklist at the bottom as a blocking gate.

---

## Guiding Principles

1. **The pipeline is the first customer of the codebase.** If CI can't build it, nothing else can either.
2. **Fast feedback beats thorough feedback when they conflict.** Target: **full pipeline < 10 minutes** on main-branch PRs for MVPs. Split slow jobs into nightly/scheduled runs.
3. **Test the golden path, not every path.** MVPs earn the right to exhaustive coverage by shipping first.
4. **Fail loud, fail early, fail once.** Every check runs independently; one failure doesn't mask others.
5. **The pipeline is code.** Pinned versions, reviewed in PRs, no mystery GUI config.
6. **Secrets never touch logs.** Ever. Not even once. Not even in debug mode.

---

## Required Pipeline Stages

The pipeline MUST implement these stages in roughly this order. Stages can run in parallel where dependencies allow.

### Stage 1: Setup & Checkout (MUST)

- [ ] **Checkout with full history** when release notes/changelogs depend on git log; otherwise shallow clone is fine.
- [ ] **Pin all action/image versions** to specific SHAs or tagged versions (e.g. `actions/checkout@v4`, not `@main`). No floating tags.
- [ ] **Cache dependencies** keyed on lockfile hash (`package-lock.json`, `pnpm-lock.yaml`, `poetry.lock`, `go.sum`, `Cargo.lock`, `pubspec.lock`).
- [ ] **Set up language runtime at pinned version** matching what production uses. Version lives in a single source of truth (`.nvmrc`, `.python-version`, `go.mod`, `rust-toolchain.toml`, etc.), not duplicated in CI config.

### Stage 2: Install & Build (MUST)

- [ ] **Install from lockfile, not manifest.** Use `npm ci` / `pnpm install --frozen-lockfile` / `pip install -r requirements.lock` / equivalent. CI must fail if the lockfile is out of sync with the manifest.
- [ ] **Build produces the same artifact CI tests and prod deploys.** Build once, promote the same artifact through stages. Do not rebuild per environment.
- [ ] **Build failures are blocking.** A failed build stops the pipeline — no running tests against a broken build.

### Stage 3: Static Analysis (MUST)

Run these in **parallel** — they're fast and independent:

- [ ] **Linter** (ESLint, Ruff, golangci-lint, clippy, dart analyze, etc.) with zero-warning policy for new code. Warnings in legacy code are tracked but don't block.
- [ ] **Formatter check** (Prettier, Black, gofmt, rustfmt, dart format) — CI verifies formatting but does not auto-fix in CI. Auto-fix is the developer's job locally.
- [ ] **Type check** where the language supports it (`tsc --noEmit`, `mypy`, `pyright`, etc.). Even JS-only projects should consider adding JSDoc + `tsc` checking.

### Stage 4: Security Scanning (MUST for MVP, but keep it light)

Pick **one** tool per category. Don't stack redundant scanners.

- [ ] **Dependency vulnerability scan** (Dependabot, `npm audit --audit-level=high`, `pip-audit`, `govulncheck`, `cargo audit`). Block on HIGH and CRITICAL; warn on MEDIUM.
- [ ] **Secret scanning** (GitHub's built-in secret scanning, Gitleaks, TruffleHog). Must run on every push, not just PRs, to catch pushes to feature branches.
- [ ] **SAST-lite** if applicable (Semgrep with a minimal ruleset, CodeQL for public repos). Skip if it adds >2 min to pipeline time in MVP phase — revisit post-launch.

**Deferred to post-MVP:** container image scanning in the critical path (run it async/nightly), SBOM generation, signed commits enforcement, license compliance scanning.

### Stage 5: Automated Tests (MUST)

The MVP testing philosophy: **test the golden path and the failure modes you've actually seen in production or staging.**

- [ ] **Unit tests** for pure functions, business logic, and anything with branching logic. Target: run in < 60s total.
- [ ] **Integration tests** for at least these critical paths:
  - Auth/session flow (login → authenticated request → logout)
  - Primary data write (the thing your users pay for)
  - Primary data read (the thing your users look at most)
  - Any external service boundary (payment, email, SMS, AI API) — **mock the external side**, test your integration layer
- [ ] **Smoke tests / E2E** for **one** complete user journey end-to-end. Just one. The journey that, if broken, means the product is down.
- [ ] **Tests run against the built artifact**, not the source tree, where the distinction matters (e.g., Next.js `next build` + `next start`, not `next dev`).

**Coverage targets for MVP:** Don't enforce a coverage percentage. Enforce that the golden path is covered. Coverage metrics become gameable pressure without benefit at this stage.

### Stage 6: Preview Deploy (SHOULD for frontend/user-facing)

- [ ] **PRs get a preview URL** posted as a PR comment (Vercel, Netlify, Cloudflare Pages, or a Kubernetes preview namespace).
- [ ] Preview deploys use **non-production secrets and a non-production database**.
- [ ] Preview URL is accessible to reviewers without VPN/auth gymnastics for MVP-stage repos (lock down when you have real users).

### Stage 7: Deploy to Production (MUST be gated)

- [ ] **Production deploys only from `main`** (or whatever the protected default branch is).
- [ ] **Branch protection enforced**: no direct pushes to `main`, required PR reviews (even if you're solo — this enforces the discipline and creates an audit trail), required passing status checks.
- [ ] **Deploy is a single command or workflow trigger**, not a multi-step manual ritual.
- [ ] **Rollback is as easy as deploy.** Document the rollback procedure in `RUNBOOK.md`. Test it once before you need it.
- [ ] **Production secrets live in the deploy platform** (Vercel env vars, GitHub Environments, Kubernetes secrets via ExternalSecrets, etc.), never in the repo and never printed to logs.

### Stage 8: Post-Deploy Verification (SHOULD)

- [ ] **Smoke test against production URL** after deploy — hit the health endpoint and one critical user-facing endpoint.
- [ ] **Uptime monitor pinging health endpoint** (UptimeRobot, Better Uptime, or similar).
- [ ] **Error tracker wired up** (Sentry, Rollbar, or equivalent) with source maps uploaded for frontend builds.

---

## Golden Path Test Definition

Every repo must define its **golden path** — the single critical user journey that, if broken, means the product is effectively down. The pipeline MUST have at least one E2E test covering this path.

Document it in this repo's `README.md` or a `GOLDEN_PATH.md` using this template:

```
## Golden Path

User goal: <what the user is trying to accomplish>

Steps:
1. <entry point — landing page, API endpoint, etc.>
2. <authentication step, if applicable>
3. <primary action — the thing the product does>
4. <verification — how the user knows it worked>

If this path breaks, the product is down.
E2E test location: <path/to/test>
```

---

## Branch & PR Workflow Requirements (MUST)

- [ ] **All work happens on feature branches.** Branch naming: `<type>/<short-desc>` where type is `feat`, `fix`, `chore`, `docs`, `refactor`.
- [ ] **PRs required for all merges to `main`.** No exceptions, even for solo projects.
- [ ] **Required status checks** configured in branch protection:
  - Build
  - Lint + Format + Typecheck
  - Tests
  - Security scans
- [ ] **Merge strategy**: squash-and-merge is the default for MVP repos (clean history, easy revert). Allow rebase for repos where atomic commits matter.
- [ ] **PR template** in `.github/PULL_REQUEST_TEMPLATE.md` with at minimum: what changed, why, how it was tested, rollback plan if non-trivial.

---

## Environment & Secrets Contract (MUST)

- [ ] **Local dev, CI, and production all read the same env var names.** Different values, same names. No `PROD_API_KEY` vs `API_KEY` split.
- [ ] **A `.env.example` file** exists at repo root, fully documented, committed. Real `.env` is gitignored.
- [ ] **CI secrets are scoped to the minimum workflows that need them.** Don't expose the production database URL to PRs from forks.
- [ ] **Secret rotation procedure documented** in `RUNBOOK.md`. Doesn't have to be automated yet; has to be written down.

---

## Observability Requirements (SHOULD for MVP)

The pipeline should enable — not necessarily own — basic observability:

- [ ] **Structured logging** (JSON logs in production). Pipeline verifies no raw `console.log` / `print` in production paths via linter rule.
- [ ] **Health endpoint** at a conventional path (`/health`, `/healthz`, `/api/health`) that returns 200 when the app is up, non-200 otherwise.
- [ ] **Version endpoint** or header exposing the deployed git SHA so you can correlate bugs to commits.

---

## Pipeline Performance Budget (SHOULD)

| Stage | Target | Hard limit |
|-------|--------|------------|
| Setup + Install (cached) | < 30s | 90s |
| Build | < 90s | 3 min |
| Static analysis (parallel) | < 60s | 2 min |
| Unit + integration tests | < 3 min | 6 min |
| E2E smoke test | < 2 min | 5 min |
| **Total PR pipeline** | **< 6 min** | **10 min** |

If the pipeline exceeds the hard limit, it needs to be split (parallelized, sharded, or moved to nightly) before adding more checks.

---

## What This Spec Does NOT Require (for MVP)

Explicitly out of scope — resist the urge to add these until you have paying users:

- Multi-region deploys
- Blue/green or canary deployment strategies
- Chaos engineering
- Load/performance testing in CI (do it manually or in a scheduled job)
- Mutation testing
- Formal security audits beyond scanners
- Compliance attestations (SOC2, HIPAA, etc.) — start the trail now, but don't let it block shipping
- 100% code coverage
- Cross-browser testing matrices — pick one browser for E2E, expand later

---

## Compliance Checklist for Claude Code

When scaffolding a new pipeline, Claude Code MUST verify every item below is satisfied before marking the task complete. When auditing an existing pipeline, Claude Code MUST report which items pass, fail, or are not applicable, and MUST NOT silently skip items.

### Core (blocking for MVP launch)

- [ ] Pipeline config is version-controlled and reviewed via PR
- [ ] All external action/image versions are pinned
- [ ] Dependencies installed from lockfile
- [ ] Build runs and produces a deployable artifact
- [ ] Linter runs and blocks on errors
- [ ] Formatter check runs and blocks on mismatch
- [ ] Type checker runs and blocks on errors (where applicable)
- [ ] Dependency vulnerability scan runs with HIGH+ blocking
- [ ] Secret scanning runs on every push
- [ ] Unit tests run and block on failure
- [ ] At least one E2E/smoke test covers the golden path
- [ ] Production deploys only from protected default branch
- [ ] Branch protection requires passing checks before merge
- [ ] Secrets are not logged or committed
- [ ] Health endpoint exists and is hit post-deploy
- [ ] Rollback procedure documented
- [ ] `.env.example` exists and is current
- [ ] Golden path is documented in the repo

### Recommended (add before first external users)

- [ ] PR preview deploys configured
- [ ] Post-deploy smoke test runs automatically
- [ ] Uptime monitor configured
- [ ] Error tracker wired up with source maps
- [ ] Pipeline runs under 10 minutes end-to-end
- [ ] PR template in place

### Nice-to-have (post-MVP)

- [ ] Container image scanning (async)
- [ ] SBOM generation
- [ ] Scheduled full-surface security scan
- [ ] Load test in scheduled pipeline
- [ ] Cross-browser E2E matrix

---

## Gap Report Format (for Claude Code audits)

When auditing an existing pipeline against this spec, produce a report in this shape:

```
# Pipeline Audit: <repo name>
Date: <YYYY-MM-DD>
Spec version: <commit SHA of this file>

## Summary
Core compliance: X / Y items passing
Recommended: X / Y items passing
Nice-to-have: X / Y items passing

## Blocking gaps (Core)
- [ ] <item> — <why it's missing or broken> — <proposed fix>

## Recommended gaps
- [ ] <item> — <why it matters> — <proposed fix>

## Not applicable
- <item> — <why N/A for this repo>

## Proposed PR plan
1. <smallest fix first>
2. <next smallest>
...
```

---

## Revision Policy

This spec is living. When a production incident reveals a gap, update this file **first**, then fix the pipeline. The spec describes the pipeline we want; incidents tell us where it needs to grow.

Pipeline changes that weaken this spec (removing a check, loosening a requirement) require an explicit justification in the PR description and a sunset/review date.
