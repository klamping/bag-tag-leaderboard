import { createElement } from "react";
import { cookies } from "next/headers.js";
import { redirect } from "next/navigation.js";
import adminAuth from "../../../lib/adminAuth.js";

const {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  getAdminCookieOptions,
  verifyAdminSecret,
} = adminAuth;

export function createAdminLoginAction({
  getCookiesStore = cookies,
  redirectTo = redirect,
  createSessionToken = createAdminSessionToken,
  getCookieOptions = getAdminCookieOptions,
  verifySecret = verifyAdminSecret,
  nodeEnv = process.env.NODE_ENV,
} = {}) {
  return async function loginAction(formData) {
    "use server";

    return submitAdminLogin(formData, {
      getCookiesStore,
      redirectTo,
      createSessionToken,
      getCookieOptions,
      verifySecret,
      nodeEnv,
    });
  };
}

async function submitAdminLogin(
  formData,
  {
    getCookiesStore = cookies,
    redirectTo = redirect,
    createSessionToken = createAdminSessionToken,
    getCookieOptions = getAdminCookieOptions,
    verifySecret = verifyAdminSecret,
    nodeEnv = process.env.NODE_ENV,
  } = {}
) {
  const submittedSecret = formData.get("secret");
  const candidateSecret = typeof submittedSecret === "string" ? submittedSecret : "";

  if (!verifySecret(candidateSecret)) {
    throw new Error("Invalid admin credentials");
  }

  getCookiesStore().set(
    ADMIN_SESSION_COOKIE,
    createSessionToken(),
    getCookieOptions(nodeEnv)
  );

  redirectTo("/admin/events/new");
}

async function loginAction(formData) {
  "use server";

  return submitAdminLogin(formData);
}

export default function AdminLoginPage() {
  return createElement(
    "main",
    null,
    createElement("h1", null, "Admin Login"),
    createElement(
      "form",
      { action: loginAction },
      createElement("label", { htmlFor: "secret" }, "Shared secret"),
      createElement("input", {
        id: "secret",
        name: "secret",
        type: "password",
        required: true,
      }),
      createElement("button", { type: "submit" }, "Sign in")
    )
  );
}
