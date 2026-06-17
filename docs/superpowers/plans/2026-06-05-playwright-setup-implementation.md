# Playwright Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install and scaffold Playwright for this Next.js repo so future browser tests can run against a production-style server without changing the existing `node:test` workflow.

**Architecture:** Add Playwright as an opt-in test path separate from `npm test`, with a single root config that launches `next build` plus `next start` through Playwright's `webServer` support. Keep the initial scaffold intentionally small: Chromium only, no initial E2E specs, a dedicated `e2e/` directory, and README plus gitignore updates that make the workflow explicit.

**Tech Stack:** Next.js 14, npm, Playwright (`@playwright/test`), Node test runner (`node --test`).

---

## File Structure

- Modify: `package.json` - add Playwright dev dependency scripts while preserving the existing `test` command.
- Modify: `package-lock.json` - npm-generated lockfile updates from installing `@playwright/test`.
- Create: `playwright.config.js` - root Playwright config for a production-style local server.
- Create: `e2e/.gitkeep` - preserve the future browser-spec directory without adding tests.
- Modify: `.gitignore` - ignore Playwright report and result artifacts.
- Modify: `README.md` - document Playwright install and usage.

---

### Task 1: Install Playwright and wire the production-runner scripts

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `playwright.config.js`

- [ ] **Step 1: Install Playwright as a dev dependency**

Run: `npm install --save-dev @playwright/test`
Expected: npm adds `@playwright/test` to `devDependencies` in `package.json` and updates `package-lock.json`.

- [ ] **Step 2: Install the Chromium browser binary Playwright will use**

Run: `npx playwright install chromium`
Expected: Playwright downloads the Chromium browser successfully with no repository file changes.

- [ ] **Step 3: Update `package.json` scripts for the opt-in E2E workflow**

Replace the scripts block with:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "node --test",
    "test:e2e": "playwright test --pass-with-no-tests",
    "test:e2e:headed": "playwright test --headed --pass-with-no-tests",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

Implementation notes:
- Keep `npm test` unchanged.
- Use `--pass-with-no-tests` on the non-UI scripts so the initial scaffold succeeds before any specs exist.
- Do not add cross-browser scripts yet.

- [ ] **Step 4: Add the root Playwright config for a production-style server**

Create `playwright.config.js` with:

```js
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run build && npm run start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
```

Implementation notes:
- Keep the config in CommonJS because the repo root package is not configured as an ES module package.
- Use `Desktop Chrome` only to keep the scaffold minimal.
- Do not add retries, CI-specific branches, or additional browser projects yet.

- [ ] **Step 5: Verify the new scripts are discoverable**

Run: `npm run`
Expected: the output includes `test:e2e`, `test:e2e:headed`, and `test:e2e:ui`.

- [ ] **Step 6: Commit the Playwright install and runner scaffold**

```bash
git add package.json package-lock.json playwright.config.js
git commit -m "test: add Playwright scaffold"
```

---

### Task 2: Add the empty E2E directory, ignore artifacts, and document the workflow

**Files:**
- Create: `e2e/.gitkeep`
- Modify: `.gitignore`
- Modify: `README.md`

- [ ] **Step 1: Preserve the empty Playwright spec directory**

Create `e2e/.gitkeep` as an empty file so the repository has an explicit future location for browser specs.

- [ ] **Step 2: Ignore Playwright output artifacts**

Append these lines to `.gitignore`:

```gitignore

# Playwright artifacts
playwright-report/
test-results/
```

Implementation notes:
- Keep the existing ignore sections intact.
- Do not add broad ignores that could hide real source files under `e2e/`.

- [ ] **Step 3: Document the Playwright scaffold in `README.md`**

Add this section after the existing `## Tests` section:

````md
## Playwright

Playwright is scaffolded for future end-to-end browser coverage and runs separately from the default Node test suite.

Install the browser binary:

```bash
npx playwright install chromium
```

Run the scaffolded Playwright commands:

```bash
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
```

Notes:

- Playwright runs against a production-style local server using `next build` and `next start`.
- The repository currently ships with no Playwright specs in `e2e/`, so the standard non-UI command is configured to pass cleanly until browser tests are added.
- `npm test` still runs the existing `node:test` suite.
````

Implementation notes:
- Keep the existing README structure and wording style.
- Do not remove the current `## Tests` instructions.

- [ ] **Step 4: Read the edited files and check for wording or formatting mistakes**

Run: `git diff -- package.json playwright.config.js .gitignore README.md e2e/.gitkeep`
Expected: the diff shows only the intended Playwright scaffold, no unrelated formatting churn, and no added browser specs.

- [ ] **Step 5: Commit the docs and repo-hygiene changes**

```bash
git add .gitignore README.md e2e/.gitkeep
git commit -m "docs: add Playwright usage notes"
```

---

### Task 3: Verify the no-tests production workflow and existing test path

**Files:**
- Verify only: no new files in this task

- [ ] **Step 1: Validate that the Playwright config loads without running specs**

Run: `npx playwright test --config=playwright.config.js --list --pass-with-no-tests`
Expected: Playwright loads the config, starts no tests, and exits successfully.

- [ ] **Step 2: Verify the scaffolded production E2E command succeeds in the no-tests state**

Run: `npm run test:e2e`
Expected: Playwright performs `next build`, starts `next start`, finds no specs under `e2e/`, and exits successfully because `--pass-with-no-tests` is enabled.

- [ ] **Step 3: Verify the existing Node test suite still works unchanged**

Run: `npm test`
Expected: the existing `node:test` suite passes without needing any Playwright-specific changes.

- [ ] **Step 4: Check the working tree for only the intended scaffold files**

Run: `git status --short`
Expected: no unexpected tracked changes remain beyond the Playwright scaffold and any generated-but-ignored Playwright artifacts.

- [ ] **Step 5: Commit the verification-backed scaffold if there are uncommitted fixes from verification**

```bash
git add package.json package-lock.json playwright.config.js .gitignore README.md e2e/.gitkeep
git commit -m "chore: verify Playwright setup"
```

Only do this step if verification required follow-up edits after the earlier commits. If no files changed during verification, skip this commit.

---

## Self-Review

- Spec coverage check: this plan covers dependency install, production-only config, dedicated scripts, empty `e2e/` directory, `.gitignore`, README updates, and verification that the no-tests path plus `npm test` both behave as required.
- Placeholder scan: no `TODO`, `TBD`, or unspecified commands remain.
- Type and naming consistency: all paths, script names, and config filenames match the approved spec.
