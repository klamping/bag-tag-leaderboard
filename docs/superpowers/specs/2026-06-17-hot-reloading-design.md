# Design: Hot Reloading

## Context

The project currently exposes a build-only static-site workflow through `bag-tag site build` and `npm run build`.

That works for production output, but it makes local site iteration slower because template and stylesheet edits require manual rebuilds and a separate way to preview the generated `dist/` output.

## Goals

- Add a local development command for the public site.
- Rebuild the site automatically when `site/` inputs change.
- Start a local preview server as part of the same workflow.
- Keep the existing production build path unchanged.
- Reuse Eleventy's built-in watch and serve behavior instead of introducing a second dev stack.

## Non-Goals

- Watching the top-level canonical `data/` JSON files by default.
- Adding custom browser-sync, websocket, or bespoke live-reload code.
- Reworking the CLI build command structure.
- Supporting dynamic reload of `.eleventy.js` without a process restart.
- Adding a separate admin runtime or application server.

## Chosen Approach

Add an `npm run dev` script that routes through a dedicated `bag-tag site dev` command, which loads the canonical store, validates it, builds `publicModel`, and then starts Eleventy in serve/watch mode with that global data injected programmatically.

This is the smallest correct change for the current architecture. The public site templates depend on `publicModel`, so plain `eleventy --serve` cannot render the site successfully in this repository. Reusing the existing Node-side data pipeline keeps development rendering aligned with production behavior while still delegating watching and preview serving to Eleventy.

## Alternatives Considered

1. Dedicated `site dev` command with programmatic Eleventy serve/watch

   Recommended. Preserves the project's canonical-store-to-public-model pipeline and still uses Eleventy for the actual watch/server runtime.

2. Plain Eleventy CLI dev mode

   Rejected. The templates depend on `publicModel`, and plain `eleventy --serve` does not inject that data, so event-page pagination fails at startup.

3. External file watcher plus standalone static server

   Functional, but it adds extra dependencies and duplicates behavior Eleventy already provides.

## Architecture

The project should expose two distinct site workflows:

1. `npm run build` for the existing production/static build path.
2. `npm run dev` for local authoring with automatic rebuilds and a preview server.

`npm run dev` should route through `bag-tag site dev`, not plain Eleventy CLI, because the repository's site templates require the same validated `publicModel` injection used by the production build path.

The Eleventy configuration should continue using the same `site/` input, `_includes`, `_data`, and `dist/` output paths so development rendering matches production rendering.

The new `site dev` command should reuse the same canonical-store loading, validation, and `buildPublicModel()` steps as `site build`, then create an Eleventy instance in `serve` run mode and start both watch and serve programmatically.

## Watch Scope

The default watch scope should be limited to the public-site source tree under `site/`.

That means the dev workflow should rebuild when any of these change:

- `site/*.njk` templates
- `site/_includes/**`
- `site/_data/**`
- `site/styles/**`

It should not watch top-level canonical data files under `data/` by default. The `site dev` command should compute `publicModel` once at startup and pass the resulting object into Eleventy, which keeps `data/` files out of the default Eleventy watch graph. If canonical data changes during development, the user can restart `npm run dev` or a future change can expand the watch scope intentionally.

Changes to `.eleventy.js` may require restarting `npm run dev` rather than attempting in-process config hot reload.

## Runtime Behavior

Running `npm run dev` should:

1. load the canonical store from `data/`
2. validate the store before starting the dev server
3. build `publicModel`
4. start Eleventy in watch mode with serve enabled
5. write generated output to `dist/`
6. rebuild automatically when watched `site/` files change

The implementation should rely on Eleventy's normal watch graph so passthrough copies such as `site/styles` remain part of the same development loop.

## Error Handling

- If canonical data fails validation, `npm run dev` should fail loudly in the terminal before starting the server.
- If Eleventy cannot start because of invalid templates or configuration, `npm run dev` should fail loudly in the terminal.
- If a watched source edit introduces a template error, the error should surface through Eleventy's existing watch-mode output.
- No custom recovery or retry logic is required for this workflow.

## Testing And Verification

This change adds a package script plus a small dev command, so automated coverage should prove both the exposed entrypoint and the startup pipeline without attempting to fully integration-test a long-running watch server inside the Node test suite.

Required coverage:

- verify `package.json` exposes an `npm run dev` script for the public-site preview workflow
- verify `runCli()` delegates `bag-tag site dev` to a dev command module
- verify the dev command validates canonical data and injects `publicModel` before handing off to Eleventy watch/serve startup

Required verification:

- run `npm run dev`
- confirm Eleventy starts a local preview server successfully
- edit a file such as `site/index.njk` or `site/styles/site.css`
- confirm the site rebuilds and the preview reflects the change

## Acceptance Criteria

1. The project exposes an `npm run dev` command for local public-site development.
2. `npm run dev` starts from the same canonical-store validation and `publicModel` generation pipeline as the production build.
3. `npm run dev` starts a local preview server and watches `site/` inputs for changes.
4. Editing watched templates or styles triggers an automatic rebuild of `dist/`.
5. The existing production build workflow remains unchanged.
6. Changes to top-level canonical `data/` files are not watched by default.
7. The workflow relies on Eleventy-native watch/serve behavior rather than a separate custom watcher stack.
