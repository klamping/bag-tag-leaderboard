let drafts = [];
let nextDraftNumber = 1;

function createDraftId() {
  const id = `evt_draft_${String(nextDraftNumber).padStart(4, "0")}`;
  nextDraftNumber += 1;
  return id;
}

async function findEventBySlug(slug) {
  return drafts.find((entry) => entry.slug === slug) || null;
}

async function insertEventDraft(payload) {
  const draft = {
    id: createDraftId(),
    ...payload,
  };

  drafts.push(draft);
  return draft;
}

function resetEventDraftStore() {
  drafts = [];
  nextDraftNumber = 1;
}

module.exports = {
  findEventBySlug,
  insertEventDraft,
  resetEventDraftStore,
};
