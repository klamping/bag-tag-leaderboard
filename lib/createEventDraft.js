const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeInput(input) {
  const slug = String(input?.slug || "").trim().toLowerCase();
  const name = String(input?.name || "").trim();
  const eventDate = String(input?.eventDate || "").trim();

  return {
    slug,
    name,
    eventDate,
    status: "draft",
  };
}

function isValid(normalized) {
  if (!normalized.slug || !normalized.name || !normalized.eventDate) {
    return false;
  }

  if (!SLUG_PATTERN.test(normalized.slug)) {
    return false;
  }

  return true;
}

async function createEventDraft({ input, findEventBySlug, insertEventDraft }) {
  const normalized = normalizeInput(input);
  if (!isValid(normalized)) {
    throw new Error("Validation failed");
  }

  const existing = await findEventBySlug(normalized.slug);
  if (existing) {
    throw new Error("Validation failed");
  }

  return insertEventDraft(normalized);
}

module.exports = {
  createEventDraft,
};
