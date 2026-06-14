#!/usr/bin/env node

const { runCli } = require("../lib/cli/runCli.js");

runCli(process.argv.slice(2))
  .then((result) => {
    const exitCode = typeof result === "number" ? result : result?.exitCode;
    if (exitCode > 0) {
      process.exit(exitCode);
    }
  })
  .catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
