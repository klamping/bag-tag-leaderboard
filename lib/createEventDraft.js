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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return false;
  }

  const [yearString, monthString, dayString] = dateValue.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
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
