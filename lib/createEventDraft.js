const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeInput(input) {
  const slug = String(input?.slug || "").trim().toLowerCase();
  const name = String(input?.name || "").trim();
  const date = String(input?.date || "").trim();
  const notes = String(input?.notes || "").trim();
  const isMajor = input?.isMajor === true || input?.isMajor === "true";

  return {
    slug,
    name,
    date,
    isMajor,
    notes,
    status: "draft",
  };
}

function isValidDate(dateValue) {
  if (!dateValue) {
    return false;
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(dateValue);
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

  if (!normalized.date) {
    fieldErrors.date = "Date is required";
  } else if (!isValidDate(normalized.date)) {
    fieldErrors.date = "Date is invalid";
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
