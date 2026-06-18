const { loadCanonicalStore } = require("../data/loadCanonicalStore");
const { validateCanonicalStore } = require("../data/validateCanonicalStore");
const { buildPublicModel } = require("../domain/buildPublicModel");
const { buildSeasonLeaderboardImageModel } = require("../domain/buildSeasonLeaderboardImageModel");
const fs = require("node:fs/promises");
const path = require("node:path");
const { Eleventy } = require("@11ty/eleventy");

function defaultIo() {
  return {
    writeStdout: (value) => process.stdout.write(value),
    writeStderr: (value) => process.stderr.write(value),
  };
}

async function siteBuildCommand(options = {}) {
  const io = options.io || defaultIo();
  const baseDirectory = options.baseDirectory || process.cwd();
  const projectDirectory = options.projectDirectory || baseDirectory;
  const readStore = options.loadCanonicalStore || loadCanonicalStore;
  const validateStore = options.validateCanonicalStore || validateCanonicalStore;
  const createPublicModel = options.buildPublicModel || buildPublicModel;
  const createSeasonLeaderboardImageModel =
    options.buildSeasonLeaderboardImageModel || buildSeasonLeaderboardImageModel;

  try {
    const store = await readStore({ baseDirectory, ...options });
    validateStore(store);
    const publicModel = createPublicModel(store);
    const seasonLeaderboardImage = createSeasonLeaderboardImageModel(publicModel);
    const siteData = {
      ...publicModel,
      seasonLeaderboardImage,
    };
    const outputDirectory = options.outputDirectory || path.join(baseDirectory, "dist");
    const inputDirectory = path.join(projectDirectory, "site");
    const configPath = path.join(projectDirectory, ".eleventy.js");
    const eleventy = new Eleventy(inputDirectory, outputDirectory, {
      source: "cli",
      configPath,
      config: (eleventyConfig) => {
        eleventyConfig.addGlobalData("publicModel", siteData);
      },
    });

    await fs.rm(outputDirectory, { recursive: true, force: true });
    await eleventy.write();

    io.writeStdout(`Built public site for ${publicModel.eventPages.length} event page(s).\n`);
    return {
      exitCode: 0,
      publicModel: siteData,
    };
  } catch (error) {
    io.writeStderr(`${error.message}\n`);
    return { exitCode: 1 };
  }
}

module.exports = {
  siteBuildCommand,
};
