---
type: TASKS
category: features
slug: update-ducvu-dsh-tool
title: "Tasks for the 0.2.1-rc.2 compatibility update"
description: "The single reviewable task and its acceptance criteria."
status: draft
created: 2026-10-18
updated: 2026-10-18
---

# Tasks for the 0.2.1-rc.2 compatibility update

Task list for this slug. Status lives in each heading, using: queued, in_progress, blocked, done, canceled.

<abstract>

One task in one milestone: make the fork load on DSH `0.2.1-rc.2` and prove it in-repo, as a single reviewable pull request.

</abstract>

<tasks>

## Tasks

Group tasks into milestones, each a result a person can check. One task is one pull request in one repository, sized for review.

### T1: Widen the DSH peers and commit the shell fix  [in_progress]

**Milestone:** the fork loads on `0.2.1-rc.2` without an exemption. **Repository:** `HeigatVu/dsh-tool-codegraph`. **Size:** small: the manifest, the entry file, one test, the check plan, the README, and the ignore file.

**Depends on:** none

**Acceptance criteria:**

- [ ] Every dsh peer union names `0.2.1-rc.1` and `0.2.1-rc.2`, and the fork version is `1.0.4`.
- [ ] `lib/index.js` contains no `ctx.shell.run(` and does call `ctx.shell.execute(`.
- [ ] `tests/peers.test.mjs` fails if the peers, the version, the README claim, or the shell call regress.
- [ ] `ua-checks.yaml` declares the checks the delivery graph reads, with no suppressed rule.
- [ ] `node --check lib/index.js && node --check lib/invariant.js` and `node --test tests/*.test.mjs` both exit 0.
- [ ] The pull request is open on the repository with its checks reported.

**Verification:** `node --test tests/*.test.mjs`

</tasks>

<revisions>

## Revisions

Appended by `ultragentic docs revise <this file> "<what changed>"`. Do not edit dates by hand.

| Date | Change |
|------|--------|
| 2026-10-18 | Created. |

</revisions>
