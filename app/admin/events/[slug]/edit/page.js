import { createElement } from "react";
import adminAuth from "../../../../../lib/adminAuth.js";

const { requireAdmin } = adminAuth;

export default async function AdminEventEditPage({
  params = {},
  requireAdminAccess = requireAdmin,
} = {}) {
  requireAdminAccess();

  return createElement(
    "main",
    null,
    createElement("h1", null, "Edit Event"),
    createElement("p", null, params.slug),
    createElement("p", null, "Coming soon.")
  );
}
