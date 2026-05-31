const test = require("node:test");
const assert = require("node:assert/strict");

const { isAdminAuthenticated, requireAdmin } = require("../lib/adminAuth");

test("isAdminAuthenticated returns true for a valid admin session cookie", () => {
  const authenticated = isAdminAuthenticated({
    getCookiesStore: () => ({
      get: (name) => {
        assert.equal(name, "admin_session");
        return { value: "valid-token" };
      },
    }),
    validateSessionToken: (token) => token === "valid-token",
  });

  assert.equal(authenticated, true);
});

test("isAdminAuthenticated returns false when admin session cookie is missing", () => {
  const authenticated = isAdminAuthenticated({
    getCookiesStore: () => ({
      get: () => undefined,
    }),
    validateSessionToken: () => true,
  });

  assert.equal(authenticated, false);
});

test("requireAdmin redirects to admin login when unauthenticated", () => {
  let redirectedTo = null;

  const authenticated = requireAdmin({
    isAuthenticated: () => false,
    redirectTo: (path) => {
      redirectedTo = path;
    },
  });

  assert.equal(authenticated, false);
  assert.equal(redirectedTo, "/admin/login");
});

test("requireAdmin does not redirect when authenticated", () => {
  let redirectedTo = null;

  const authenticated = requireAdmin({
    isAuthenticated: () => true,
    redirectTo: (path) => {
      redirectedTo = path;
    },
  });

  assert.equal(authenticated, true);
  assert.equal(redirectedTo, null);
});
