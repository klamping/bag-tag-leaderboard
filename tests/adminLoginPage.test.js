const test = require("node:test");
const assert = require("node:assert/strict");

test("loginAction throws on invalid shared secret and does not set cookie", async () => {
  const { createAdminLoginAction } = await import("../app/admin/login/page.js");

  const cookiesStore = {
    set: () => {
      throw new Error("cookie should not be set");
    },
  };

  const loginAction = createAdminLoginAction({
    getCookiesStore: () => cookiesStore,
    redirectTo: () => {
      throw new Error("redirect should not happen");
    },
    createSessionToken: () => "token",
    getCookieOptions: () => ({ secure: true }),
    verifySecret: () => false,
    nodeEnv: "production",
  });

  await assert.rejects(() => loginAction(new FormData()), /Invalid admin credentials/);
});

test("loginAction sets session cookie and redirects on valid shared secret", async () => {
  const { createAdminLoginAction } = await import("../app/admin/login/page.js");

  const cookieCalls = [];
  let redirectedTo = null;

  const loginAction = createAdminLoginAction({
    getCookiesStore: () => ({
      set: (...args) => {
        cookieCalls.push(args);
      },
    }),
    redirectTo: (path) => {
      redirectedTo = path;
    },
    createSessionToken: () => "signed-token",
    getCookieOptions: (env) => ({ secure: env === "production", httpOnly: true, maxAge: 1800 }),
    verifySecret: (candidate) => candidate === "top-secret",
    nodeEnv: "production",
  });

  const formData = new FormData();
  formData.set("secret", "top-secret");

  await loginAction(formData);

  assert.deepEqual(cookieCalls, [
    ["admin_session", "signed-token", { secure: true, httpOnly: true, maxAge: 1800 }],
  ]);
  assert.equal(redirectedTo, "/admin/events");
});

test("AdminLoginPage wires the form to the exported top-level action", async () => {
  const module = await import("../app/admin/login/page.js");

  const page = module.default();
  const children = Array.isArray(page.props.children)
    ? page.props.children
    : [page.props.children];
  const form = children.find((child) => child?.type === "form");

  assert.ok(form);
  assert.equal(form.props.action, module.adminLoginAction);
});
