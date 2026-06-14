const fs = require("node:fs/promises");

const { getCanonicalDataFilePaths } = require("./filePaths");
const { validateCanonicalStore } = require("./validateCanonicalStore");
const {
  writeJsonFileToTempFile,
  renameTempFileIntoPlace,
} = require("./writeJsonFileAtomic");

async function readExistingFile(fileSystem, filePath) {
  try {
    return await fileSystem.readFile(filePath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
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

function attachCleanupErrors(error, cleanupErrors) {
  if (!cleanupErrors.length) {
    return error;
  }

  error.cleanupErrors = [...(error.cleanupErrors || []), ...cleanupErrors];
  return error;
}

async function cleanupTemporaryFiles(fileSystem, temporaryFiles) {
  const cleanupErrors = [];

  for (const file of temporaryFiles) {
    try {
      await fileSystem.rm(file.temporaryFilePath, { force: true });
    } catch (cleanupError) {
      cleanupErrors.push(cleanupError);
    }
  }

  return cleanupErrors;
}

async function restoreRenamedFiles(fileSystem, renamedFiles, originalFiles) {
  const restoreErrors = [];

  for (const filePath of renamedFiles) {
    const originalFile = originalFiles.find((file) => file.filePath === filePath);

    try {
      await restoreFile(fileSystem, filePath, originalFile ? originalFile.contents : null);
    } catch (restoreError) {
      restoreErrors.push(restoreError);
    }
  }

  return restoreErrors;
}

async function saveCanonicalStore(store, options = {}) {
  const fileSystem = options.fs || fs;
  const nextStore = {
    players: store.players,
    events: store.events,
    results: store.results,
  };

  validateCanonicalStore(nextStore);

  const filePaths = getCanonicalDataFilePaths(options);
  const temporaryFiles = [];
  const originalFiles = [];

  await fileSystem.mkdir(filePaths.importsDirectory, { recursive: true });

  originalFiles.push({
    filePath: filePaths.players,
    contents: await readExistingFile(fileSystem, filePaths.players),
  });
  originalFiles.push({
    filePath: filePaths.events,
    contents: await readExistingFile(fileSystem, filePaths.events),
  });
  originalFiles.push({
    filePath: filePaths.results,
    contents: await readExistingFile(fileSystem, filePaths.results),
  });

  try {
    temporaryFiles.push({
      destinationPath: filePaths.players,
      temporaryFilePath: await writeJsonFileToTempFile(filePaths.players, nextStore.players, options),
    });
    temporaryFiles.push({
      destinationPath: filePaths.events,
      temporaryFilePath: await writeJsonFileToTempFile(filePaths.events, nextStore.events, options),
    });
    temporaryFiles.push({
      destinationPath: filePaths.results,
      temporaryFilePath: await writeJsonFileToTempFile(filePaths.results, nextStore.results, options),
    });
  } catch (error) {
    const cleanupErrors = await cleanupTemporaryFiles(fileSystem, temporaryFiles);
    throw attachCleanupErrors(error, cleanupErrors);
  }

  const renamedFiles = [];

  try {
    for (const file of temporaryFiles) {
      await renameTempFileIntoPlace(file.temporaryFilePath, file.destinationPath, options);
      renamedFiles.push(file.destinationPath);
    }
  } catch (error) {
    const restoreErrors = await restoreRenamedFiles(fileSystem, renamedFiles, originalFiles);
    const cleanupErrors = await cleanupTemporaryFiles(fileSystem, temporaryFiles);

    throw attachCleanupErrors(error, [...restoreErrors, ...cleanupErrors]);
  }
}

module.exports = {
  saveCanonicalStore,
};
