const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");

async function waitForServer(url, { attempts = 120, delayMs = 500 } = {}) {
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }

      lastError = new Error(`Unexpected status: ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw lastError || new Error(`Timed out waiting for ${url}`);
}

async function waitForExit(child, { attempts = 20, delayMs = 100 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (child.exitCode !== null) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

function startDevServer(port) {
  const child = spawn("npm", ["run", "dev", "--", "--port", String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ADMIN_SHARED_SECRET: "test-secret",
    },
    stdio: "ignore",
  });

  return {
    child,
    getOutput: () => "",
  };
}

test("admin login form submits successfully at runtime", async () => {
  const port = 3101;
  const { child, getOutput } = startDevServer(port);

  try {
    const pageResponse = await waitForServer(`http://127.0.0.1:${port}/admin/login`);
    const html = await pageResponse.text();
    const actionMatch = html.match(/name="(\$ACTION_ID_[^"]+)"/);

    assert.ok(actionMatch, `Expected server action id in login form. Output:\n${getOutput()}`);

    const formData = new FormData();
    formData.set(actionMatch[1], "");
    formData.set("secret", "test-secret");

    const submitResponse = await fetch(`http://127.0.0.1:${port}/admin/login`, {
      method: "POST",
      body: formData,
      redirect: "manual",
    });

    assert.equal(submitResponse.status, 303, await submitResponse.text());
    assert.equal(submitResponse.headers.get("location"), "/admin/events/new");
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await waitForExit(child);
    }

    if (child.exitCode === null) {
      child.kill("SIGKILL");
      await waitForExit(child);
    }
  }
});
