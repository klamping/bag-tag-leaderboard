const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");

const { loginAsAdmin } = require("../e2e/helpers/adminScoreboard.js");

test("loginAsAdmin waits for the authenticated admin page after submitting the login form", async () => {
  const calls = [];

  const page = {
    goto: async (url) => {
      calls.push(["goto", url]);
    },
    getByLabel: (label) => ({
      fill: async (value) => {
        calls.push(["fill", label, value]);
      },
    }),
    getByRole: (role, options) => ({
      click: async () => {
        calls.push(["click", role, options]);
      },
    }),
    waitForURL: async (url) => {
      calls.push(["waitForURL", url]);
    },
  };

  await loginAsAdmin({ page });

  assert.deepEqual(calls, [
    ["goto", "/admin/login"],
    ["fill", "Shared secret", "playwright-admin-secret"],
    ["click", "button", { name: "Sign in" }],
    ["waitForURL", /\/admin\/events\/new$/],
  ]);
});

test("admin scoreboard e2e helpers use stable test ids for scoreboard assertions", async () => {
  const source = await fs.readFile("e2e/helpers/adminScoreboard.js", "utf8");

  assert.match(source, /getByTestId\(`event-scoreboard-row-\$\{rowId\}`\)/);
  assert.match(source, /getByTestId\(`event-scoreboard-\$\{cell\}-\$\{rowId\}`\)/);
  assert.match(source, /getByTestId\(`leaderboard-row-\$\{rowId\}`\)/);
  assert.match(source, /getByTestId\(`leaderboard-\$\{cell\}-\$\{rowId\}`\)/);
  assert.doesNotMatch(source, /locator\("tbody tr"\)/);
  assert.doesNotMatch(source, /getTableRowByPlayerName/);
});
