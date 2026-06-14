const { eventsImportCommand } = require("./eventsImportCommand");
const { eventsDeleteCommand } = require("./eventsDeleteCommand");
const { siteBuildCommand } = require("./siteBuildCommand");

async function runCli(argv, options = {}) {
  const [group, action] = argv;
  const usageMessage = [
    "Usage:",
    "  bag-tag events import",
    "  bag-tag events delete",
    "  bag-tag site build",
    "",
  ].join("\n");

  if (group === "events" && action === "import") {
    return (options.eventsImportCommand || eventsImportCommand)(options);
  }

  if (group === "events" && action === "delete") {
    return (options.eventsDeleteCommand || eventsDeleteCommand)(options);
  }

  if (group === "site" && action === "build") {
    return (options.siteBuildCommand || siteBuildCommand)(options);
  }

  throw new Error(usageMessage);
}

module.exports = { runCli };
