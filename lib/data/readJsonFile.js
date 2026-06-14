const fs = require("node:fs/promises");

async function readJsonFile(filePath) {
  const contents = await fs.readFile(filePath, "utf8");
  return JSON.parse(contents);
}

module.exports = {
  readJsonFile,
};
