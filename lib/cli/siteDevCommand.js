const fs = require("node:fs/promises");
const path = require("node:path");
const { Eleventy } = require("@11ty/eleventy");
const { loadCanonicalStore } = require("../data/loadCanonicalStore");
const { validateCanonicalStore } = require("../data/validateCanonicalStore");
const { buildPublicModel } = require("../domain/buildPublicModel");

function defaultIo() {
  return {
    writeStdout: (value) => process.stdout.write(value),
    writeStderr: (value) => process.stderr.write(value),
  };
}

async function siteDevCommand(options = {}) {
  const io = options.io || defaultIo();
  const baseDirectory = options.baseDirectory || process.cwd();
  const projectDirectory = options.projectDirectory || baseDirectory;
  const readStore = options.loadCanonicalStore || loadCanonicalStore;
  const validateStore = options.validateCanonicalStore || validateCanonicalStore;
  const createPublicModel = options.buildPublicModel || buildPublicModel;
  const EleventyConstructor = options.Eleventy || Eleventy;
  const fileSystem = options.fs || fs;

  try {
    const store = await readStore({ baseDirectory, ...options });
    validateStore(store);
    const publicModel = createPublicModel(store);
    const inputDirectory = path.join(projectDirectory, "site");
    const outputDirectory = options.outputDirectory || path.join(baseDirectory, "dist");
    const configPath = path.join(projectDirectory, ".eleventy.js");

    await fileSystem.rm(outputDirectory, { recursive: true, force: true });

    const eleventy = new EleventyConstructor(inputDirectory, outputDirectory, {
      source: "cli",
      runMode: "serve",
      configPath,
      config: (eleventyConfig) => {
        eleventyConfig.addGlobalData("publicModel", publicModel);
      },
    });

    await eleventy.init();
    eleventy.setIgnoreInitial(false);
    await eleventy.watch();
    await eleventy.serve(options.port);

    io.writeStdout("Started public site dev server.\n");
    return { exitCode: 0 };
  } catch (error) {
    io.writeStderr(`${error.message}\n`);
    return { exitCode: 1 };
  }
}

module.exports = {
  siteDevCommand,
};
