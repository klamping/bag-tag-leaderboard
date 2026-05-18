# Plan: Bag Tag Leaderboard (Phase 1 Focus)

> Source PRD: `docs/superpowers/specs/2026-05-08-bag-tag-website-design.md`

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: Public routes are `/`, `/events`, `/events/:slug`; admin lives under `/admin/*`; Phase 1 implements only `/`.
- **Schema**: Relational Postgres model with `players`, `events`, `event_results`, `event_points`, `audit_log`; only confirmed events contribute to public views.
- **Key models**: Player identity is exact-name based; events have status (`draft|confirmed`) and season (`2026` default).
- **Auth**: Shared-password admin gate for `/admin/*` (out of scope for Phase 1 build).
- **Third-party boundary**: UDisc scraping occurs only in admin import workflow (out of scope for Phase 1 build).

---

## Phase 1: Public Leaderboard Skeleton

**User stories**:

- As a visitor, I can open `/` and see a 2026 leaderboard table structure.
- As a visitor, I only see data derived from confirmed events.
- As a maintainer, I can verify the leaderboard path end-to-end even before full import tooling exists.

### What to build

Deliver a narrow, end-to-end vertical slice for the homepage leaderboard. The app serves `/` publicly and queries season leaderboard data using the durable schema assumptions and confirmed-event filter. The page renders stable columns (`Rank`, `Player`, `Events Played`, `Season Points`) and handles the empty-state case when no confirmed events exist. Include basic verification coverage for route rendering and confirmed-only aggregation behavior so this slice is demoable on its own.

### Acceptance criteria

- [ ] Visiting `/` renders a leaderboard table with columns: Rank, Player, Events Played, Season Points.
- [ ] Leaderboard query/filter is scoped to season `2026`.
- [ ] Only confirmed events are included in season totals.
- [ ] Tie display behavior is preserved for equal totals (shared rank format such as `1,2,2,4`).
- [ ] Empty data state is user-friendly when no confirmed events exist.
- [ ] Basic automated verification exists for route rendering and confirmed-only aggregation logic.

---

## Later phases (queued, not in current execution scope)

1. Admin Access + Event Draft Creation
2. UDisc Fetch + Draft Preview
3. Starting Tag Entry + Validation
4. Points Breakdown + Confirm Import
5. Public Event Views (`/events`, `/events/:slug`)
6. Post-Confirm Edits + Audit Trail
7. Failure and Integrity Hardening
