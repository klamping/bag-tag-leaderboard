import { createElement } from "react";
import adminAuth from "../../../../lib/adminAuth.js";

const { requireAdmin } = adminAuth;

export default function AdminNewEventPage() {
  requireAdmin();

  return createElement(
    "main",
    null,
    createElement("h1", null, "Create Event Draft"),
    createElement("p", null, "Admin event drafting UI coming soon.")
  );
}
