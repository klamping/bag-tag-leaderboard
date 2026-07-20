## Summary

Adjust the homepage leaderboard table so the `Season Standing` column is narrower and the `Season Total` column is centered consistently in both the header and body.

## Current State

- The homepage leaderboard table is rendered in `site/index.njk`.
- The `Season Standing` header and cells already use a shared `.season-standing` class.
- The second column (`Season Total`) is currently aligned left through `nth-child(2)` selectors in `site/styles/site.css`.

## Proposed Change

1. Keep the existing `.season-standing` hook and change its width from `4em` to `5em`.
2. Add a dedicated class to the `Season Total` header and body cells in `site/index.njk`.
3. Replace the current second-column left-alignment rule with explicit centering for the new `Season Total` class.

## Why This Approach

- It is the smallest functional change.
- It avoids relying only on column position for alignment.
- It keeps the existing markup and styling structure intact while making the `Season Total` rule more explicit.

## Affected Files

- `site/index.njk`
- `site/styles/site.css`
- `tests/siteBuildCommand.test.js`

## Testing

- Update or add assertions in `tests/siteBuildCommand.test.js` for the new `Season Total` class if needed.
- Run the relevant test file to verify the homepage markup and stylesheet expectations.

## Error Handling And Risk

- Low risk: the change is limited to one table template and its CSS.
- Main risk is stale test expectations if they assert the previous bare header markup or selector behavior.
