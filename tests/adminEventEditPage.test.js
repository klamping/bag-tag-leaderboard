const test = require("node:test");
const assert = require("node:assert/strict");
const { renderToStaticMarkup } = require("react-dom/server");

test("AdminEventEditPage renders a placeholder scaffold for the selected slug", async () => {
  const { default: AdminEventEditPage } = await import("../app/admin/events/[slug]/edit/page.js");

  let requireAdminCalls = 0;
  const html = renderToStaticMarkup(
    await AdminEventEditPage({
      params: { slug: "spring-showdown" },
      requireAdminAccess: () => {
        requireAdminCalls += 1;
      },
    })
  );

  assert.equal(requireAdminCalls, 1);
  assert.match(html, /Edit Event/);
  assert.match(html, /spring-showdown/);
  assert.match(html, /Coming soon\./);
});
