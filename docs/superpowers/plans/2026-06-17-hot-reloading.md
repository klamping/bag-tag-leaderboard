# Hot Reloading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `npm run dev` workflow that starts Eleventy’s local preview server and rebuilds automatically when public-site source files change.

**Architecture:** Keep the existing `bag-tag site build` CLI path unchanged for production builds. Add the new development workflow at the package-script boundary by invoking Eleventy directly in `--serve` mode, which already includes file watching for the configured `site/` source tree and writes output to the existing `dist/` directory.

**Tech Stack:** Node.js, npm scripts, built-in `node:test`, CommonJS package metadata, Eleventy 3

---

## File Map

- Modify: `tests/packageScripts.test.js`
  Responsible for locking down the declared npm scripts and dependency expectations in `package.json`.
- Modify: `package.json`
  Responsible for exposing the new `dev` entry point while preserving the current production build scripts.
- Modify: `README.md`
  Responsible for documenting the local preview workflow and the updated package-script list.

No CLI command, Eleventy config, or site template changes are required for this feature.

### Task 1: Prove the Missing Dev Script with a Failing Package Script Test

**Files:**
- Modify: `tests/packageScripts.test.js`
- Test: `tests/packageScripts.test.js`

- [ ] **Step 1: Write the failing test**

Update the existing script test in `tests/packageScripts.test.js` so it also asserts the new dev workflow:

```js
test("package scripts target the CLI, static build, and Eleventy dev server directly", () => {
  assert.equal(packageJson.scripts.build, "npm run build:site");
  assert.equal(packageJson.scripts["build:site"], "node ./bin/bag-tag.js site build");
  assert.equal(packageJson.scripts.dev, "eleventy --serve");
  assert.equal(packageJson.scripts.test, "node --test");
  assert.equal("build:next" in packageJson.scripts, false);
  assert.equal("test:e2e" in packageJson.scripts, false);
  assert.equal("test:e2e:headed" in packageJson.scripts, false);
  assert.equal("test:e2e:ui" in packageJson.scripts, false);
});
```

Keep the dependency test unchanged.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/packageScripts.test.js`

Expected: FAIL on `packageJson.scripts.dev` because the `dev` script does not exist yet.

- [ ] **Step 3: Commit the red test checkpoint**

```bash
git add tests/packageScripts.test.js
git commit -m "test: require Eleventy dev script"
```

### Task 2: Add the Eleventy Dev Script in the Smallest Possible Place

**Files:**
- Modify: `package.json`
- Modify: `tests/packageScripts.test.js`
- Test: `tests/packageScripts.test.js`

- [ ] **Step 1: Write minimal implementation**

Update the `scripts` block in `package.json` to add the dev workflow without changing the existing build commands:

```json
{
  "name": "bag-tag-leaderboard",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "npm run build:site",
    "build:site": "node ./bin/bag-tag.js site build",
    "dev": "eleventy --serve",
    "test": "node --test"
  },
  "bin": {
    "bag-tag": "./bin/bag-tag.js"
  },
  "dependencies": {
    "@11ty/eleventy": "^3.1.6",
    "he": "^1.2.0"
  }
}
```

Do not route `dev` through `bag-tag site build`. The spec explicitly keeps watch/serve behavior inside Eleventy’s native development mode.

- [ ] **Step 2: Run test to verify it passes**

Run: `node --test tests/packageScripts.test.js`

Expected: PASS, including the new assertion for `packageJson.scripts.dev`.

- [ ] **Step 3: Run the full automated suite**

Run: `npm test`

Expected: PASS with no regressions in the broader CLI and site-build tests.

- [ ] **Step 4: Commit the implementation**

```bash
git add package.json tests/packageScripts.test.js
git commit -m "feat: add Eleventy dev script"
```

### Task 3: Document the Local Preview Workflow and Manually Verify It

**Files:**
- Modify: `README.md`
- Test: none

- [ ] **Step 1: Update the README command lists**

Make these exact documentation edits in `README.md`.

In the `## Package Scripts` code block, change the list to:

```text
npm run build
npm run build:site
npm run dev
npm test
```

Then add this new section immediately after `## Package Scripts`:

```md
## Development Preview

Run the Eleventy preview server with automatic rebuilds for `site/` changes:

`npm run dev`

This watches the public-site source tree under `site/`, rebuilds `dist/` when templates or styles change, and serves the generated site locally.
```

Keep the existing `bag-tag site build` documentation intact so production/static build behavior stays clear.

- [ ] **Step 2: Run the focused script test again**

Run: `node --test tests/packageScripts.test.js`

Expected: PASS. This confirms the README update did not accompany any accidental script regression.

- [ ] **Step 3: Manually verify the dev workflow**

Run: `npm run dev`

Expected terminal behavior:

- Eleventy starts successfully.
- The preview server announces a local URL.
- The initial build writes to `dist/`.

While `npm run dev` is running, make a small temporary edit to one watched file such as `site/index.njk` or `site/styles/site.css`, save it, and confirm Eleventy reports a rebuild. Then revert that temporary edit before continuing so no verification-only change remains in the worktree.

- [ ] **Step 4: Commit the docs update**

```bash
git add README.md
git commit -m "docs: add local preview workflow"
```

### Task 4: Final Verification Snapshot

**Files:**
- Modify: none
- Test: `tests/packageScripts.test.js`

- [ ] **Step 1: Re-run the full automated suite**

Run: `npm test`

Expected: PASS.

- [ ] **Step 2: Capture the final worktree state**

Run: `git status --short`

Expected: no unexpected changes from the hot-reloading work beyond the files intentionally modified for this feature.

- [ ] **Step 3: Final commit if verification required follow-up edits**

If manual verification forced any real source adjustment beyond the planned commits above, commit it with:

```bash
git add package.json tests/packageScripts.test.js README.md
git commit -m "chore: finalize hot reloading workflow"
```

If no follow-up edits were needed, skip this step.
