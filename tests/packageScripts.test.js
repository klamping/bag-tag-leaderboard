const test = require("node:test");
const assert = require("node:assert/strict");

const packageJson = require("../package.json");

test("package scripts target the CLI, static build, and site dev directly", () => {
  assert.equal(packageJson.scripts.build, "npm run build:site");
  assert.equal(packageJson.scripts["build:site"], "node ./bin/bag-tag.js site build");
  assert.equal(packageJson.scripts.dev, "node ./bin/bag-tag.js site dev");
  assert.equal(packageJson.scripts.test, "node --test");
  assert.equal("build:next" in packageJson.scripts, false);
  assert.equal("test:e2e" in packageJson.scripts, false);
  assert.equal("test:e2e:headed" in packageJson.scripts, false);
  assert.equal("test:e2e:ui" in packageJson.scripts, false);
});

test("package dependencies drop the old Next.js admin runtime", () => {
  assert.equal("next" in (packageJson.dependencies || {}), false);
  assert.equal("react" in (packageJson.dependencies || {}), false);
  assert.equal("react-dom" in (packageJson.dependencies || {}), false);
  assert.equal("@playwright/test" in (packageJson.devDependencies || {}), false);
  assert.equal("@11ty/eleventy" in (packageJson.dependencies || {}), true);
});
