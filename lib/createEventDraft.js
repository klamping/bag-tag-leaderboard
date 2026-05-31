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

function getFieldErrors(normalized) {
  const fieldErrors = {};

  if (!normalized.slug) {
    fieldErrors.slug = "Slug is required";
  } else if (!SLUG_PATTERN.test(normalized.slug)) {
    fieldErrors.slug = "Slug format is invalid";
  }

  if (!normalized.name) {
    fieldErrors.name = "Name is required";
  }

  if (!normalized.eventDate) {
    fieldErrors.eventDate = "Event date is required";
  }

  return fieldErrors;
}

async function createEventDraft({ input, findEventBySlug, insertEventDraft }) {
  const normalized = normalizeInput(input);
  const fieldErrors = getFieldErrors(normalized);

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const existing = await findEventBySlug(normalized.slug);
  if (existing) {
    return {
      fieldErrors: {
        slug: "Slug is already in use",
      },
    };
  }

  return insertEventDraft(normalized);
}

module.exports = {
  createEventDraft,
};
