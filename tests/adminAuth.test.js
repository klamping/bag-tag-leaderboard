const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminCookieOptions,
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

test("createAdminSessionToken creates distinct signed tokens", () => {
  process.env.ADMIN_SHARED_SECRET = "top-secret";

  const firstToken = createAdminSessionToken();
  const secondToken = createAdminSessionToken();

  assert.notEqual(firstToken, secondToken);
  assert.equal(isAdminSessionTokenValid(firstToken), true);
  assert.equal(isAdminSessionTokenValid(secondToken), true);
});

test("isAdminSessionTokenValid fails closed without secret for malformed token", () => {
  delete process.env.ADMIN_SHARED_SECRET;

  assert.equal(isAdminSessionTokenValid("anything"), false);
});

test("isAdminSessionTokenValid throws for signed token when secret is unset", () => {
  process.env.ADMIN_SHARED_SECRET = "top-secret";
  const signedToken = createAdminSessionToken();

  delete process.env.ADMIN_SHARED_SECRET;

  assert.throws(() => isAdminSessionTokenValid(signedToken), /ADMIN_SHARED_SECRET must be set/);
});

test("isAdminSessionTokenValid checks admin token", () => {
  process.env.ADMIN_SHARED_SECRET = "top-secret";

  const validToken = createAdminSessionToken();

  assert.equal(isAdminSessionTokenValid(validToken), true);
  assert.equal(isAdminSessionTokenValid("invalid"), false);
  assert.equal(isAdminSessionTokenValid(""), false);
  assert.equal(isAdminSessionTokenValid(null), false);
});

test("isAdminSessionTokenValid rejects expired tokens", () => {
  process.env.ADMIN_SHARED_SECRET = "top-secret";

  const validToken = createAdminSessionToken({
    now: () => new Date("2026-05-10T12:00:00.000Z"),
  });

  assert.equal(
    isAdminSessionTokenValid(validToken, {
      now: () => new Date("2026-05-10T12:45:00.000Z"),
      maxAgeSeconds: 1800,
    }),
    false
  );
});

test("exports stable admin session cookie name", () => {
  assert.equal(ADMIN_SESSION_COOKIE, "admin_session");
});

test("getAdminCookieOptions sets secure flag by environment", () => {
  assert.deepEqual(getAdminCookieOptions("development"), {
    httpOnly: true,
    maxAge: 1800,
    path: "/",
    sameSite: "lax",
    secure: false,
  });

  assert.deepEqual(getAdminCookieOptions("production"), {
    httpOnly: true,
    maxAge: 1800,
    path: "/",
    sameSite: "lax",
    secure: true,
  });
});
