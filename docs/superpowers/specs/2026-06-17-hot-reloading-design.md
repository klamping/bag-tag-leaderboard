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

Add an `npm run dev` script that starts Eleventy in watch-and-serve mode against the existing `site/` input directory.

This is the smallest change that fits the current architecture. It keeps local preview behavior inside the same static-site toolchain already used for production output, avoids duplicate watcher logic, and preserves the current `npm run build` and `bag-tag site build` workflow unchanged.

## Alternatives Considered

1. Native Eleventy dev mode

   Recommended. Minimal code, minimal maintenance, and aligned with the current public-site stack.

2. Wrapper Node script around Eleventy

   Viable if the project later needs more explicit watch-target control or extra startup behavior, but unnecessary for the current scope.

3. External file watcher plus standalone static server

   Functional, but it adds extra dependencies and duplicates behavior Eleventy already provides.

## Architecture

The project should expose two distinct site workflows:

1. `npm run build` for the existing production/static build path.
2. `npm run dev` for local authoring with automatic rebuilds and a preview server.

`npm run dev` should invoke Eleventy directly rather than routing through `bag-tag site build`, because the CLI command is intentionally build-oriented and does not currently model a long-running watch server process.

The Eleventy configuration should continue using the same `site/` input, `_includes`, `_data`, and `dist/` output paths so development rendering matches production rendering.

## Watch Scope

The default watch scope should be limited to the public-site source tree under `site/`.

That means the dev workflow should rebuild when any of these change:

- `site/*.njk` templates
- `site/_includes/**`
- `site/_data/**`
- `site/styles/**`

It should not watch top-level canonical data files under `data/` by default. If those files change during development, the user can rerun the dev command or a future change can expand the watch scope intentionally.

Changes to `.eleventy.js` may require restarting `npm run dev` rather than attempting in-process config hot reload.

## Runtime Behavior

Running `npm run dev` should:

1. start Eleventy in watch mode
2. start Eleventy's local preview server
3. write generated output to `dist/`
4. rebuild automatically when watched `site/` files change

The implementation should rely on Eleventy's normal watch graph so passthrough copies such as `site/styles` remain part of the same development loop.

## Error Handling

- If Eleventy cannot start because of invalid templates or configuration, `npm run dev` should fail loudly in the terminal.
- If a watched source edit introduces a template error, the error should surface through Eleventy's existing watch-mode output.
- No custom recovery or retry logic is required for this workflow.

## Testing And Verification

This change is primarily a package-script workflow addition, so automated coverage should stay focused on preventing accidental regression in the declared scripts rather than attempting to fully integration-test a long-running watch server inside the Node test suite.

Required coverage:

- verify `package.json` exposes an `npm run dev` script for the public-site preview workflow

Required verification:

- run `npm run dev`
- confirm Eleventy starts a local preview server successfully
- edit a file such as `site/index.njk` or `site/styles/site.css`
- confirm the site rebuilds and the preview reflects the change

## Acceptance Criteria

1. The project exposes an `npm run dev` command for local public-site development.
2. `npm run dev` starts a local preview server and watches `site/` inputs for changes.
3. Editing watched templates or styles triggers an automatic rebuild of `dist/`.
4. The existing production build workflow remains unchanged.
5. Changes to top-level canonical `data/` files are not watched by default.
6. The workflow relies on Eleventy-native watch/serve behavior rather than a separate custom watcher stack.
