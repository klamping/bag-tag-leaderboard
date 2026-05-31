const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  isAdminSessionTokenValid,
  verifyAdminSecret,
} = require("../lib/adminAuth");

const ORIGINAL_ADMIN_SHARED_SECRET = process.env.ADMIN_SHARED_SECRET;

test.afterEach(() => {
  if (ORIGINAL_ADMIN_SHARED_SECRET === undefined) {
    delete process.env.ADMIN_SHARED_SECRET;
    return;
  }

  process.env.ADMIN_SHARED_SECRET = ORIGINAL_ADMIN_SHARED_SECRET;
});

test("verifyAdminSecret throws when ADMIN_SHARED_SECRET is not set", () => {
  delete process.env.ADMIN_SHARED_SECRET;

  assert.throws(
    () => verifyAdminSecret("anything"),
    /ADMIN_SHARED_SECRET must be set/
  );
});

test("verifyAdminSecret validates exact shared secret", () => {
  process.env.ADMIN_SHARED_SECRET = "top-secret";

  assert.equal(verifyAdminSecret("top-secret"), true);
  assert.equal(verifyAdminSecret("TOP-SECRET"), false);
});

test("createAdminSessionToken throws when ADMIN_SHARED_SECRET is not set", () => {
  delete process.env.ADMIN_SHARED_SECRET;

  assert.throws(() => createAdminSessionToken(), /ADMIN_SHARED_SECRET must be set/);
});

test("createAdminSessionToken is deterministic for a shared secret", () => {
  process.env.ADMIN_SHARED_SECRET = "top-secret";

  assert.equal(
    createAdminSessionToken(),
    "2dbeab3e81b998c4a17dbc7446e2ff97d3c8d5c98da06d60f8b08d9760dbbc32"
  );
  assert.equal(createAdminSessionToken(), createAdminSessionToken());
});

test("isAdminSessionTokenValid throws when ADMIN_SHARED_SECRET is not set", () => {
  delete process.env.ADMIN_SHARED_SECRET;

  assert.throws(
    () => isAdminSessionTokenValid("anything"),
    /ADMIN_SHARED_SECRET must be set/
  );
});

test("isAdminSessionTokenValid checks admin token", () => {
  process.env.ADMIN_SHARED_SECRET = "top-secret";

  const validToken = createAdminSessionToken();

  assert.equal(isAdminSessionTokenValid(validToken), true);
  assert.equal(
    isAdminSessionTokenValid(
      "2dbeab3e81b998c4a17dbc7446e2ff97d3c8d5c98da06d60f8b08d9760dbbc31"
    ),
    false
  );
  assert.equal(isAdminSessionTokenValid(""), false);
  assert.equal(isAdminSessionTokenValid(null), false);
});

test("exports stable admin session cookie name", () => {
  assert.equal(ADMIN_SESSION_COOKIE, "admin_session");
});
