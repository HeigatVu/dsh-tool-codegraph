---
type: PLAN
category: features
slug: update-ducvu-dsh-tool
title: "How the 0.2.1-rc.2 compatibility update ships"
description: "The order the packaging fix, the shell call, the proof, and the pull request are delivered in."
status: draft
created: 2026-10-18
updated: 2026-10-18
---

# How the 0.2.1-rc.2 compatibility update ships

Plan: how the SPEC in this folder will be delivered, in what order, and what could go wrong.

<abstract>

The change is small and single-branch: update the peer unions and version, keep the already-written shell fix, add one test that reads the manifest and the entry file, then open the pull request and let the declared checks prove it. Three phases run in order because each one's proof depends on the previous one's files; nothing here is parallelizable. The riskiest step is the boot gate itself: the repository's own test can prove the metadata, but only a harness restart can prove the plugin loads.

</abstract>

<approach>

## Approach

One branch in `HeigatVu/dsh-tool-codegraph`, built in three sequential phases:

1. **Metadata and the call site.** Widen each dsh peer union with the two new prerelease versions, bump the fork version, and stage the existing `ctx.shell.execute()` change. This is the only behavior-bearing edit.
2. **Proof.** Add the test that reads `package.json` and `lib/index.js`, declare `ua-checks.yaml` so the graph's verifier nodes have real commands, refresh the README paragraph that claims what the fork supports, and add the state ignore file. Nothing here changes runtime behavior; it changes what can be checked.
3. **Delivery.** Commit in small groups with a why, push the branch, open the pull request, wait for CI, record the ship decision, and let the release review pass before the merge gate.

No dependency needs installing: the test uses `node:test` and reads files, so it works from a clean checkout.

## Phases

| Phase | Delivers | Checkpoint |
|-------|----------|------------|
| 1 | A manifest whose peers name the running runtime, a bumped version, and the shell fix in the working tree | `node --check lib/index.js` and a diff review of `package.json` |
| 2 | A test that fails on a regression of either requirement, a declared check plan, and a README that matches the manifest | `node --test tests/*.test.mjs` exits 0 |
| 3 | A pushed branch and an open pull request whose checks and reviews are recorded | `gh pr checks` is green and the ship decision is GO |

</approach>

<risks>

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| The boot gate still refuses because one peer string is malformed or misses a package | medium | The test compares every dsh peer key against a fixed list and requires both new versions in the value; a typo fails the test. |
| The test passes while the plugin still cannot load | medium | Treated as a known ceiling: metadata is checkable in-repo, loading is checkable only by restarting the harness. The PR records the restart attempt rather than claiming it passed. |
| Widening peers silently accepts a runtime whose shell API differs | low | The `execute()` call is asserted by the same test, and the runtime version that was actually verified is named in the README and the PR. |
| A stale run task list makes the delivery loop repeat work | low | Task status is written to `TASKS.md` and the task list together as each acceptance criterion is met, before the verifier reads it. |

</risks>

<verification>

## Verification

- `node --check lib/index.js && node --check lib/invariant.js` — syntax.
- `node --test tests/*.test.mjs` — peers, version, README claim, and no `ctx.shell.run(`.
- `git diff main...HEAD --stat` — scope check, nothing beyond the manifest, entry file, test, checks file, README, and ignore file.
- `gh pr checks` — required checks on the open pull request.
- Harness restart after the merge — the only observation that proves loading; recorded in the run's evidence rather than asserted by CI.

</verification>

<revisions>

## Revisions

Appended by `ultragentic docs revise <this file> "<what changed>"`. Do not edit dates by hand.

| Date | Change |
|------|--------|
| 2026-10-18 | Created. |

</revisions>
