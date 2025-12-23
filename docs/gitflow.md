# GitFlow (Classic) Workflow

This repo supports a classic GitFlow model:

- `main`: production-ready code (tagged releases)
- `develop`: integration branch for ongoing work
- `feature/*`: new features (branch from `develop`, merge back to `develop`)
- `release/*`: stabilization + versioning (branch from `develop`, merge to `main`, then back-merge to `develop`)
- `hotfix/*`: urgent fixes (branch from `main`, merge to `main`, then back-merge to `develop`)

## Repository settings (recommended)

These are GitHub settings (not code) but they’re what enforce “code review in each step”:

- Protect `main` and `develop`
  - Require pull requests
  - Require 1+ approvals
  - Require status checks (`CI`, `GitFlow Policy`)
  - Disallow force-push
- (Optional) Add `CODEOWNERS` so reviews are auto-requested.

## Day-to-day flow

### Start a feature

1. `git checkout develop && git pull`
2. `git checkout -b feature/<ticket>-<short-description>`
3. Commit using Conventional Commits (e.g. `feat(users): require first/last name`).
4. Push and open a PR: `feature/...` → `develop`
5. Get review(s) and merge.

### Cut a release (this is how changes reach `main`)

1. `git checkout develop && git pull`
2. `git checkout -b release/<version>` (e.g. `release/1.2.0`)
3. Stabilize: bugfixes only, update docs, ensure CI is green.
4. Run `bun run release` (uses `standard-version`) and push the commit.
5. Open a PR: `release/...` → `main` (review required).
6. Merge PR to `main` and push tags.
7. Back-merge: open PR `main` → `develop` (keeps `develop` in sync).

### Hotfix

1. `git checkout main && git pull`
2. `git checkout -b hotfix/<ticket>-<short-description>`
3. Fix + test.
4. Open PR: `hotfix/...` → `main` (review required), merge.
5. Open PR: `main` → `develop`, merge.

## Challenge requirement: “at least one PR merged to main”

In classic GitFlow, feature work merges into `develop`, and the **release PR** is what merges into `main`.
To satisfy the requirement:

- Create a `feature/*` PR into `develop` (reviewed)
- Create a `release/*` PR into `main` and merge it (reviewed)

