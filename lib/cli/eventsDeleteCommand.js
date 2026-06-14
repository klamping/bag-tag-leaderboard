const fs = require("node:fs/promises");
const path = require("node:path");
const readline = require("node:readline/promises");

const { getCanonicalDataFilePaths } = require("../data/filePaths");
const { loadCanonicalStore } = require("../data/loadCanonicalStore");
const { saveCanonicalStore } = require("../data/saveCanonicalStore");
const { deleteEventBySlug } = require("../domain/deleteEventBySlug");
const { confirmDelete } = require("./prompts/confirmDelete");

function defaultIo() {
  return {
    writeStdout: (value) => process.stdout.write(value),
    writeStderr: (value) => process.stderr.write(value),
  };
}

async function promptForSlug({ input = process.stdin, output = process.stdout }) {
  const rl = readline.createInterface({ input, output });

  try {
    return (await rl.question("Event slug: ")).trim();
  } finally {
    rl.close();
  }
}

function resolveImportSnapshotPath(importPath, { baseDirectory = process.cwd() } = {}) {
  if (typeof importPath !== "string" || importPath.trim() === "") {
    throw new Error("Import snapshot path must stay within data/imports.");
  }

  const { importsDirectory } = getCanonicalDataFilePaths({ baseDirectory });
  const resolvedImportsDirectory = path.resolve(importsDirectory);
  const resolvedSnapshotPath = path.resolve(baseDirectory, importPath);
  const relativePath = path.relative(resolvedImportsDirectory, resolvedSnapshotPath);

  if (
    relativePath === "" ||
    relativePath === "." ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error("Import snapshot path must stay within data/imports.");
  }

  return resolvedSnapshotPath;
}

async function removeImportSnapshot(importPath, { baseDirectory = process.cwd(), fileSystem = fs } = {}) {
  await fileSystem.rm(resolveImportSnapshotPath(importPath, { baseDirectory }), { force: true });
}

async function eventsDeleteCommand(options = {}) {
  const io = options.io || defaultIo();
  const baseDirectory = options.baseDirectory || process.cwd();
  const readSlug = options.promptForSlug || promptForSlug;
  const readStore = options.loadCanonicalStore || loadCanonicalStore;
  const confirmDeletion = options.confirmDelete || confirmDelete;
  const persistStore = options.saveCanonicalStore || saveCanonicalStore;
  const applyDelete = options.deleteEventBySlug || deleteEventBySlug;
  const deleteSnapshot = options.removeImportSnapshot || removeImportSnapshot;

  try {
    const slug = await readSlug(options);
    const store = await readStore({ baseDirectory, ...options });
    const event = store.events.items.find((entry) => entry.slug === slug);

    if (!event) {
      io.writeStderr(`Event not found for slug ${slug}.\n`);
      return { exitCode: 1 };
    }

    io.writeStdout(
      `Deleting event ${event.slug}: ${event.name} on ${event.eventDate} (${event.resultIds.length} results)\n`
    );

    const confirmed = await confirmDeletion({ event, ...options });
    if (!confirmed) {
      io.writeStderr("Deletion cancelled.\n");
      return { exitCode: 1 };
    }

    const nextState = applyDelete({ store, slug });

    for (const snapshotPath of nextState.deletedSnapshotPaths) {
      resolveImportSnapshotPath(snapshotPath, { baseDirectory });
    }

    await persistStore(nextState.store, { baseDirectory, ...options });

    for (const snapshotPath of nextState.deletedSnapshotPaths) {
      await deleteSnapshot(snapshotPath, { baseDirectory, ...options });
    }

    io.writeStdout(`Deleted event ${event.slug}.\n`);
    return {
      exitCode: 0,
      slug: event.slug,
      deletedResults: store.results.items.length - nextState.store.results.items.length,
      deletedSnapshotPaths: nextState.deletedSnapshotPaths,
    };
  } catch (error) {
    io.writeStderr(`${error.message}\n`);
    return { exitCode: 1 };
  }
}

module.exports = {
  eventsDeleteCommand,
  promptForSlug,
  removeImportSnapshot,
};
