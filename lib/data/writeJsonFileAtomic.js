const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

function attachCleanupErrors(error, cleanupErrors) {
  if (!cleanupErrors.length) {
    return error;
  }

  error.cleanupErrors = [...(error.cleanupErrors || []), ...cleanupErrors];
  return error;
}

async function writeJsonFileToTempFile(filePath, value, options = {}) {
  const fileSystem = options.fs || fs;

  await fileSystem.mkdir(path.dirname(filePath), { recursive: true });

  const temporaryFilePath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${crypto.randomUUID()}.tmp`
  );
  const contents = `${JSON.stringify(value, null, 2)}\n`;

  try {
    await fileSystem.writeFile(temporaryFilePath, contents, "utf8");
  } catch (error) {
    const cleanupErrors = [];

    try {
      await fileSystem.rm(temporaryFilePath, { force: true });
    } catch (cleanupError) {
      cleanupErrors.push(cleanupError);
    }

    throw attachCleanupErrors(error, cleanupErrors);
  }

  return temporaryFilePath;
}

async function renameTempFileIntoPlace(temporaryFilePath, filePath, options = {}) {
  const fileSystem = options.fs || fs;

  await fileSystem.rename(temporaryFilePath, filePath);
}

async function writeJsonFileAtomic(filePath, value, options = {}) {
  const temporaryFilePath = await writeJsonFileToTempFile(filePath, value, options);
  await renameTempFileIntoPlace(temporaryFilePath, filePath, options);
}

module.exports = {
  writeJsonFileToTempFile,
  renameTempFileIntoPlace,
  writeJsonFileAtomic,
};
