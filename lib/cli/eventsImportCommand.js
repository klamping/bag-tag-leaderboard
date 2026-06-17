const fs = require("node:fs/promises");
const path = require("node:path");
const readline = require("node:readline/promises");

const { fetchUdiscEventFromUrl } = require("../udiscClient");
const { mapUdiscEventToImportReview } = require("../udiscToImportReview");
const { createImportSnapshot } = require("../domain/createImportSnapshot");
const { validateEventReviewRows } = require("../domain/validateEventReviewRows");
const { replaceEventBySlug } = require("../domain/replaceEventBySlug");
const { loadCanonicalStore } = require("../data/loadCanonicalStore");
const { emptyCanonicalStore } = require("../data/emptyCanonicalStore");
const { getCanonicalDataFilePaths } = require("../data/filePaths");
const { nextId } = require("../data/idGenerator");
const { rebuildEventOrdering } = require("../data/rebuildEventOrdering");
const { writeJsonFileToTempFile, renameTempFileIntoPlace } = require("../data/writeJsonFileAtomic");
const { validateCanonicalStore } = require("../data/validateCanonicalStore");
const { scoreEvent } = require("../scoreEvent");
const { promptEventMetadata } = require("./prompts/promptEventMetadata");
const { confirmReplacement } = require("./prompts/confirmReplacement");
const { reviewImportTable } = require("./tui/reviewImportTable");
const { printImportPreview } = require("./formatters/printImportPreview");
const { normalizePlayerName } = require("../data/normalizePlayerName");

function defaultIo() {
  return {
    writeStdout: (value) => process.stdout.write(value),
    writeStderr: (value) => process.stderr.write(value),
  };
}

function createPromptSession({ input = process.stdin, output = process.stdout }) {
  let buffer = "";
  let ended = false;
  let closed = false;
  const lines = [];
  const waiters = [];

  function flushBuffer() {
    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex >= 0) {
      const line = buffer.slice(0, newlineIndex).replace(/\r$/, "");
      buffer = buffer.slice(newlineIndex + 1);
      lines.push(line);
      const waiter = waiters.shift();
      if (waiter) waiter();
      newlineIndex = buffer.indexOf("\n");
    }
  }

  function onData(chunk) {
    buffer += String(chunk);
    flushBuffer();
  }

  function onEnd() {
    ended = true;
    if (buffer.length > 0) {
      lines.push(buffer.replace(/\r$/, ""));
      buffer = "";
    }
    while (waiters.length > 0) {
      waiters.shift()();
    }
  }

  input.setEncoding?.("utf8");
  input.on?.("data", onData);
  input.on?.("end", onEnd);

  return {
    async question(prompt) {
      if (closed) {
        throw new Error("prompt session was closed");
      }

      output.write(prompt);

      if (lines.length === 0 && !ended) {
        await new Promise((resolve) => waiters.push(resolve));
      }

      return lines.shift() || "";
    },
    close() {
      closed = true;
      input.off?.("data", onData);
      input.off?.("end", onEnd);
      input.pause?.();

      while (waiters.length > 0) {
        waiters.shift()();
      }
    },
  };
}

async function promptForLeaderboardUrl({ session, input = process.stdin, output = process.stdout }) {
  if (typeof session?.question === "function") {
    return (await session.question("UDisc leaderboard URL: ")).trim();
  }

  const rl = readline.createInterface({ input, output });

  try {
    return (await rl.question("UDisc leaderboard URL: ")).trim();
  } finally {
    rl.close();
  }
}

async function confirmSavePrompt({ session, input = process.stdin, output = process.stdout }) {
  if (typeof session?.question === "function") {
    const answer = (await session.question("Save import? (y/N): ")).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  }

  const rl = readline.createInterface({ input, output });

  try {
    const answer = (await rl.question("Save import? (y/N): ")).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

function isCancelled(result) {
  return result === false || result === null || result?.ok === false || result?.cancelled === true;
}

function isValidEventDate(dateValue) {
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

function validateEditedEventMetadata(event) {
  const fieldErrors = {};
  const name = String(event?.name || "").trim();
  const slug = String(event?.slug || "").trim().toLowerCase();
  const eventDate = String(event?.eventDate || "").trim();

  if (!name) {
    fieldErrors.name = "Name is required";
  }

  if (!slug) {
    fieldErrors.slug = "Slug is required";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    fieldErrors.slug = "Slug format is invalid";
  }

  if (!eventDate) {
    fieldErrors.eventDate = "Event date is required";
  } else if (!isValidEventDate(eventDate)) {
    fieldErrors.eventDate = "Event date is invalid";
  }

  return {
    ok: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    event: {
      ...event,
      name,
      slug,
      eventDate,
      isMajor: event?.isMajor === true,
    },
  };
}

function normalizeRowsForReview(rows, players) {
  const playersByNormalizedName = new Map();

  for (const player of players) {
    const normalizedName = normalizePlayerName(player.name);
    const matches = playersByNormalizedName.get(normalizedName) || [];
    matches.push(player);
    playersByNormalizedName.set(normalizedName, matches);
  }

  return rows.map((row) => {
    const matches = playersByNormalizedName.get(normalizePlayerName(row.playerName)) || [];

    if (matches.length === 1) {
      return {
        ...row,
        matchStatus: "existing",
        playerId: matches[0].id,
      };
    }

    if (matches.length > 1) {
      return {
        ...row,
        matchStatus: "ambiguous",
      };
    }

    return {
      ...row,
      matchStatus: "new",
    };
  });
}

function isBootstrapImport(store) {
  return Array.isArray(store?.events?.items) && store.events.items.length === 0;
}

function createPlayerRecord({ id, name, now }) {
  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
  };
}

function materializeReviewedRows({ store, rows, now }) {
  const nextPlayers = [...store.players.items];
  const playerIds = new Set(nextPlayers.map((player) => player.id));
  const canonicalRows = [];
  let playersCreated = 0;

  for (const row of rows) {
    if (row.reviewDecision === "remove") {
      continue;
    }

    if (row.matchStatus === "ambiguous") {
      throw new Error(`Reviewed row for ${row.playerName} could not be uniquely matched`);
    }

    let playerId = row.playerId;
    if (row.matchStatus === "new") {
      playerId = nextId(nextPlayers, "player");
      nextPlayers.push(createPlayerRecord({ id: playerId, name: row.playerName, now }));
      playersCreated += 1;
      playerIds.add(playerId);
    }

    if (!playerIds.has(playerId)) {
      throw new Error(`Reviewed row for ${row.playerName} references an unknown player`);
    }

    canonicalRows.push({
      playerId,
      finishPlace: row.reviewDecision === "dnf" ? null : row.finishPlace,
      startingTag: row.startingTag,
    });
  }

  return {
    store: {
      ...store,
      players: {
        ...store.players,
        items: nextPlayers,
      },
    },
    canonicalRows,
    playersCreated,
  };
}

function buildNewEventStore({ store, event, canonicalRows, leaderboardUrl, importPath, now }) {
  const eventId = nextId(store.events.items, "event");
  const resultPool = [...store.results.items];
  const scoredRows = scoreEvent({
    isMajor: event.isMajor,
    participants: canonicalRows,
  });
  const nextResults = [...store.results.items];
  const resultIds = [];

  for (let index = 0; index < canonicalRows.length; index += 1) {
    const canonicalRow = canonicalRows[index];
    const scoredRow = scoredRows[index];
    const resultId = nextId(resultPool, "result");
    resultPool.push({ id: resultId });
    resultIds.push(resultId);
    nextResults.push({
      id: resultId,
      eventId,
      playerId: canonicalRow.playerId,
      finishPlace: canonicalRow.finishPlace,
      startingTag: canonicalRow.startingTag,
      attendancePoints: scoredRow.attendance,
      placementPoints: scoredRow.placement,
      startingTagBonusPoints: scoredRow.startingTagBonus,
      tagOneBonusPoints: scoredRow.tagOneBonus,
      beatYourTagBonusPoints: scoredRow.beatYourTagBonus,
      eventTotalPoints: scoredRow.eventTotal,
      createdAt: now,
      updatedAt: now,
    });
  }

  const nextEvent = {
    id: eventId,
    slug: event.slug,
    name: event.name,
    eventDate: event.eventDate,
    isMajor: event.isMajor === true,
    udiscUrl: leaderboardUrl,
    importPath,
    resultIds,
    createdAt: now,
    updatedAt: now,
  };

  return {
    ...store,
    events: {
      ...store.events,
      items: rebuildEventOrdering([...store.events.items, nextEvent]),
    },
    results: {
      ...store.results,
      items: nextResults,
    },
  };
}

async function readExistingFile(fileSystem, filePath) {
  try {
    return await fileSystem.readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function restoreFile(fileSystem, filePath, contents) {
  if (contents === null) {
    await fileSystem.rm(filePath, { force: true });
    return;
  }

  await fileSystem.writeFile(filePath, contents, "utf8");
}

async function cleanupTemporaryFiles(fileSystem, temporaryFiles) {
  for (const file of temporaryFiles) {
    await fileSystem.rm(file.temporaryFilePath, { force: true });
  }
}

async function persistImport({ baseDirectory, store, snapshot, importPath, fs: fileSystem = fs }) {
  validateCanonicalStore(store);

  const filePaths = getCanonicalDataFilePaths({ baseDirectory });
  const snapshotPath = path.join(baseDirectory || process.cwd(), importPath);
  const targets = [
    filePaths.players,
    filePaths.events,
    filePaths.results,
    snapshotPath,
  ];
  const originals = [];
  const temporaryFiles = [];
  const renamedFiles = [];

  for (const filePath of targets) {
    originals.push({ filePath, contents: await readExistingFile(fileSystem, filePath) });
  }

  try {
    temporaryFiles.push({
      destinationPath: filePaths.players,
      temporaryFilePath: await writeJsonFileToTempFile(filePaths.players, store.players, { fs: fileSystem }),
    });
    temporaryFiles.push({
      destinationPath: filePaths.events,
      temporaryFilePath: await writeJsonFileToTempFile(filePaths.events, store.events, { fs: fileSystem }),
    });
    temporaryFiles.push({
      destinationPath: filePaths.results,
      temporaryFilePath: await writeJsonFileToTempFile(filePaths.results, store.results, { fs: fileSystem }),
    });
    temporaryFiles.push({
      destinationPath: snapshotPath,
      temporaryFilePath: await writeJsonFileToTempFile(snapshotPath, snapshot, { fs: fileSystem }),
    });

    for (const file of temporaryFiles) {
      await renameTempFileIntoPlace(file.temporaryFilePath, file.destinationPath, { fs: fileSystem });
      renamedFiles.push(file.destinationPath);
    }
  } catch (error) {
    for (const filePath of renamedFiles) {
      const original = originals.find((entry) => entry.filePath === filePath);
      await restoreFile(fileSystem, filePath, original ? original.contents : null);
    }

    await cleanupTemporaryFiles(fileSystem, temporaryFiles);
    throw error;
  }
}

async function loadStoreOrEmpty(loadStore) {
  try {
    return await loadStore();
  } catch (error) {
    if (error?.code === "ENOENT") {
      return emptyCanonicalStore();
    }

    throw error;
  }
}

async function eventsImportCommand(options = {}) {
  const io = options.io || defaultIo();
  const now = typeof options.now === "function" ? options.now() : new Date().toISOString();
  const loadStore = options.loadCanonicalStore || loadCanonicalStore;
  const usesManagedPromptSession = (
    !options.promptForLeaderboardUrl ||
    !options.promptEventMetadata ||
    !options.confirmReplacement ||
    !options.confirmSave ||
    options.input ||
    options.output
  );
  const promptSession = usesManagedPromptSession
    ? createPromptSession({
        input: options.input || process.stdin,
        output: options.output || process.stdout,
      })
    : null;

  try {
    const leaderboardUrl = await (options.promptForLeaderboardUrl || promptForLeaderboardUrl)({
      session: promptSession,
      input: options.input,
      output: options.output,
    });

    if (isCancelled(leaderboardUrl) || String(leaderboardUrl || "").trim() === "") {
      return { exitCode: 1, error: "Event import cancelled" };
    }

    const store = await loadStoreOrEmpty(() => loadStore({ baseDirectory: options.baseDirectory }));
    const bootstrap = isBootstrapImport(store);
    const importedEvent = await (options.fetchUdiscEventFromUrl || fetchUdiscEventFromUrl)({
      leaderboardUrl,
    });
    const mapped = mapUdiscEventToImportReview({
      importedEvent,
      players: store.players.items,
    });

    if (!mapped.ok) {
      return { exitCode: 1, error: Object.values(mapped.fieldErrors).join(", ") };
    }

    const reviewedEvent = await (options.promptEventMetadata || promptEventMetadata)({
      event: mapped.review.event,
      session: promptSession,
      input: options.input,
      output: options.output,
    });

    if (isCancelled(reviewedEvent)) {
      return { exitCode: 1, error: "Event import cancelled" };
    }

    const validatedEvent = validateEditedEventMetadata(reviewedEvent);
    if (!validatedEvent.ok) {
      return { exitCode: 1, error: Object.values(validatedEvent.fieldErrors).join(", ") };
    }

    const eventMetadata = validatedEvent.event;

    if (bootstrap) {
      io.writeStdout("No existing events found. Importing as bootstrap event; starting tags will be skipped.\n");
    }

    const existingEvent = store.events.items.find((event) => event.slug === eventMetadata.slug) || null;
    if (existingEvent) {
      const confirmed = await (options.confirmReplacement || confirmReplacement)({
        existingEvent,
        nextEvent: eventMetadata,
        session: promptSession,
        input: options.input,
        output: options.output,
      });

      if (isCancelled(confirmed)) {
        return { exitCode: 1, error: "Event import cancelled" };
      }
    }

    const reviewRows = await (options.reviewImportTable || reviewImportTable)({
      event: eventMetadata,
      rows: normalizeRowsForReview(mapped.review.rows, store.players.items),
      bootstrap,
      session: promptSession,
      input: options.input,
      output: options.output,
    });

    if (isCancelled(reviewRows)) {
      return { exitCode: 1, error: "Event import cancelled" };
    }

    const validation = validateEventReviewRows({ rows: reviewRows, bootstrap });
    if (!validation.ok) {
      return { exitCode: 1, error: Object.values(validation.fieldErrors).join(", ") };
    }

    const previewOutput = (options.printImportPreview || printImportPreview)({
      event: eventMetadata,
      rows: reviewRows,
      existingEvent,
    });
    if (previewOutput) {
      io.writeStdout(`${previewOutput}\n`);
    }

    const confirmedSave = await (options.confirmSave || confirmSavePrompt)({
      event: eventMetadata,
      rows: reviewRows,
      existingEvent,
      session: promptSession,
      input: options.input,
      output: options.output,
    });
    if (isCancelled(confirmedSave)) {
      return { exitCode: 1, error: "Event import cancelled" };
    }

    const importPath = path.join("data", "imports", `${eventMetadata.slug}.json`);
    const snapshot = createImportSnapshot({
      slug: eventMetadata.slug,
      sourceUrl: leaderboardUrl,
      fetchedAt: now,
      event: eventMetadata,
      reviewedRows: reviewRows,
    });
    const materialized = materializeReviewedRows({
      store,
      rows: reviewRows,
      now,
    });
    const nextStore = existingEvent
      ? replaceEventBySlug({
          store: materialized.store,
          slug: eventMetadata.slug,
          eventInput: {
            slug: eventMetadata.slug,
            name: eventMetadata.name,
            eventDate: eventMetadata.eventDate,
            isMajor: eventMetadata.isMajor === true,
            udiscUrl: leaderboardUrl,
            importPath,
          },
          reviewedRows: materialized.canonicalRows,
          now,
        }).store
      : buildNewEventStore({
          store: materialized.store,
          event: eventMetadata,
          canonicalRows: materialized.canonicalRows,
          leaderboardUrl,
          importPath,
          now,
        });

    await (options.persistImport || persistImport)({
      baseDirectory: options.baseDirectory,
      store: nextStore,
      snapshot,
      importPath,
    });

    const summary = {
      slug: eventMetadata.slug,
      replaced: Boolean(existingEvent),
      playersCreated: materialized.playersCreated,
      rowsSaved: materialized.canonicalRows.length,
      importPath,
    };

    io.writeStdout(
      `Saved event ${summary.slug} (${summary.rowsSaved} row${summary.rowsSaved === 1 ? "" : "s"}, ${summary.playersCreated} new player${summary.playersCreated === 1 ? "" : "s"}).\n`
    );

    return {
      exitCode: 0,
      summary,
    };
  } catch (error) {
    io.writeStderr(`${error.message}\n`);
    return {
      exitCode: 1,
      error: error.message,
    };
  } finally {
    promptSession?.close();
  }
}

module.exports = {
  eventsImportCommand,
  persistImport,
};
