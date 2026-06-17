# Bag Tag Leaderboard

Bag Tag Leaderboard is a local-first CLI plus static-site workflow for tracking event results and publishing season standings.

## Requirements

- Node.js 18+
- npm

## Install

```bash
npm install
```

## Canonical Data

The CLI stores canonical state in versioned JSON wrappers under `data/`:

- `data/players.json`
- `data/events.json`
- `data/results.json`
- `data/imports/*.json` for saved UDisc import snapshots

## CLI Commands

Primary commands:

- `bag-tag events import`
- `bag-tag events delete`
- `bag-tag site build`

Examples:

```bash
node ./bin/bag-tag.js events import
node ./bin/bag-tag.js events delete
node ./bin/bag-tag.js site build
```

`bag-tag events delete` is interactive and prompts for the event slug before confirmation.

`bag-tag site build` reads the canonical store and writes the Eleventy output to `dist/`.

## Package Scripts

```bash
npm run build
npm run build:site
npm run dev
npm test
```

## Development Preview

`npm run dev` loads the canonical store, validates it, builds the public site data model, serves the site locally, and rebuilds when files under `site/` change.

## Tests

Run the Node test suite:

```bash
npm test
```

## Notes

- No Next.js app server or admin runtime is required for the primary workflow.
- The public site is generated from the JSON data files during `site build`.
