# Playwright Setup Design

## Context

This repository is a Next.js 14 application with its existing automated coverage centered on the built-in Node test runner via `npm test` and `node --test`. There is currently no browser automation harness, no Playwright dependency, and no E2E-specific scripts. The goal of this change is to install and scaffold Playwright for future browser tests without adding any initial E2E specs and without changing the current unit/integration test workflow.

## Goals

- Add Playwright to the repository as an opt-in browser test runner.
- Run Playwright against a production-style Next.js server using `next build` and `next start`.
- Keep the existing `node:test` workflow unchanged.
- Create the minimum repo structure and documentation needed for future E2E tests.

## Non-Goals

- Do not add any initial Playwright test cases.
- Do not replace the existing `npm test` command.
- Do not add a separate development-server Playwright path.
- Do not broaden the scaffold into cross-browser coverage before there are real browser specs to justify it.

## Approach Options Considered

### Recommended: Production-only minimal scaffold

Install Playwright, add a single root config, wire it to build and start the Next.js app, add dedicated E2E scripts, create the `e2e/` directory, and document the workflow.

Why this is recommended:

- It matches the chosen default developer workflow of testing against a production-like server.
- It avoids unnecessary complexity while the repo has no E2E specs yet.
- It keeps browser testing clearly separated from the existing Node test runner.

Tradeoffs:

- Startup is slower because every run requires a production build.
- The scaffold is intentionally narrow and does not optimize for rapid local iteration.

### Alternative: Dual dev and production Playwright workflows

Provide separate commands or configs for `next dev` and `next start`.

Why not now:

- It adds more surface area to scripts and docs before there is a demonstrated need.
- The user explicitly chose a production-only default.

### Alternative: Development-only Playwright workflow

Use `next dev` as the Playwright server.

Why not now:

- It is less aligned with deployed behavior.
- The chosen requirement is production-only setup.

## Design

### Dependencies

- Add `@playwright/test` as a development dependency.
- Install the Playwright browser binaries required for local execution.

The repository should continue to treat Playwright as an optional path invoked only through dedicated scripts.

### Scripts

Add dedicated npm scripts without changing the existing `test` script:

- `test:e2e` for standard Playwright runs
- `test:e2e:headed` for headed runs
- `test:e2e:ui` for Playwright UI mode

`npm test` remains mapped to `node --test` so current unit and integration workflows do not change.

Because this scaffold intentionally ships with no browser specs, the standard non-UI Playwright scripts should be configured to tolerate the initial no-tests state, for example by using Playwright's no-tests pass-through behavior in the script command.

### Playwright Configuration

Create a single root Playwright configuration file.

Configuration requirements:

- Use `http://127.0.0.1:3000` as the base URL.
- Use Playwright `webServer` integration to start a fresh production server for each run.
- Run `npm run build` before `npm run start` as part of the Playwright server lifecycle.
- Set `reuseExistingServer: false` so Playwright never attaches to an already-running local server.
- Keep the initial browser project list minimal, with Chromium only.
- Configure standard artifact output locations so future failures have predictable traces and reports.

Because there are no initial E2E specs, the config should optimize for correctness and clarity rather than coverage breadth.

### Repository Layout

- Add an `e2e/` directory for future browser tests.
- Do not add real test specs as part of this scaffold.
- If an empty directory cannot be preserved directly, include the smallest practical placeholder file or first-run-compatible structure needed to keep the directory in the repository.

This keeps the intended test location explicit without inventing placeholder test behavior.

### Git Ignore Updates

Update `.gitignore` to exclude Playwright-generated artifacts, specifically:

- `playwright-report/`
- `test-results/`

If the chosen installation path introduces any repo-local Playwright cache or output directories, those should also be ignored.

### Documentation

Update `README.md` with a short Playwright section that covers:

- the purpose of the scaffold
- how to install dependencies and Playwright browsers
- the new `npm run test:e2e`, `npm run test:e2e:headed`, and `npm run test:e2e:ui` commands
- the fact that the repository currently contains no Playwright specs yet

The documentation should make it obvious that Playwright is available but not part of the default test path.

## Data Flow And Runtime Behavior

1. A developer runs one of the dedicated Playwright npm scripts.
2. Playwright starts by creating a fresh production build of the Next.js app.
3. Playwright launches `next start` on port 3000.
4. Browser specs under `e2e/` are executed against that running server.
5. Reports, traces, and screenshots are written to ignored artifact directories.

For the initial scaffold, step 4 will have no matching specs, so the standard scripted run should succeed in a clean no-tests state rather than implying missing coverage is an error.

## Error Handling

- If `next build` fails, the Playwright run should fail immediately and surface the build failure.
- If the production server cannot start on the configured port, the Playwright run should fail with the server startup error.
- If no specs exist yet, the workflow should remain understandable and documented so developers know the scaffold is present by design.

No custom error handling code is required beyond standard Playwright and npm command behavior.

## Testing And Verification

Verification for this scaffold should cover:

- dependency installation succeeds
- Playwright browser installation succeeds
- the Playwright config is valid
- the dedicated E2E scripts invoke correctly
- a no-spec Playwright run exits cleanly and predictably

The existing `npm test` command should still pass unchanged after the scaffold is added.

## Success Criteria

- The repo contains Playwright as a dev dependency.
- Dedicated E2E scripts exist and are separate from `npm test`.
- Playwright runs against a production-style Next.js server.
- The repo has a clear `e2e/` home for future browser specs.
- Playwright artifacts are ignored.
- The README explains how to use the scaffold.
- No browser specs are added as part of this change.
