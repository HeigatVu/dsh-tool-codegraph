---
type: SPEC
category: features
slug: update-ducvu-dsh-tool
title: "dsh-tool-codegraph on DeepSeek Harness 0.2.1-rc.2"
description: "Which changes let the local codegraph fork load under DSH 0.2.1-rc.2, and why each one is the smallest that does."
status: draft
created: 2026-10-18
updated: 2026-10-18
---

# dsh-tool-codegraph on DeepSeek Harness 0.2.1-rc.2

Specification: what is being built or changed, and how a person will know it works.

<abstract>

The local fork `@ducvu/dsh-tool-codegraph` stopped loading after the DeepSeek Harness was upgraded to `0.2.1-rc.2`, because its exact `peerDependencies` unions end at `0.2.0-rc.2` and the boot compatibility check therefore refuses the plugin. This spec widens those unions, keeps the uncommitted `ctx.shell.execute()` fix the plugin needs on the current shell API, bumps the fork version, and records the change in the README and a runnable test. It is done when the package loads under `0.2.1-rc.2` without a compatibility exemption and the change is on `main` through the reviewed pull-request flow.

</abstract>

<context>

## Objective

The fork exists so that a local DSH install can mount the `codegraph_*` tools without granting a per-version exemption. DSH `0.2.1-rc.2` moved the runtime version past the last peer entry, so the fork's reason to exist now causes its own outage: the plugin is not loaded and the tools never appear. The same upgrade also made the old shell call stale — it was already fixed in the working tree with `ctx.shell.execute()` and never committed.

This work is for the machine's owner, who runs the plugin through the `web` profile as a `link:` dependency. The one result that means done: a clean checkout of `main` at the new version loads on `0.2.1-rc.2` with no compatibility exemption.

## Assumptions

- A1. The installed runtime is `0.2.1-rc.2`, and its shell service still exposes `resolve()` and `execute()` and does not expose `run()`. Checked by reading the type declarations shipped with `@deepseek-ai/dsh-shell@0.2.1-rc.2`.
- A2. The plugin is loaded through the profile's `link:` dependency, so edits take effect after a harness restart without reinstalling anything.
- A3. The `codegraph` CLI and the ten tool definitions are unchanged by this work; only packaging metadata and the existing shell call are in scope.
- A4. Keeping the exact-union peer style is deliberate: each supported DSH release stays named and reviewable, rather than hidden inside an open-ended range.
- A5. `@deepseek-ai/dsh-invariants` is not shipped as a separate installed package in this runtime, yet the compatibility check compares the peer range against the runtime version, so it must be widened with the rest.

## Stack and commands

Plain ESM Node.js package, `type: module`, no build step, Node `^22.19 || >=24` (this machine runs 24.13.0). Commands:

- Syntax check (lint): `node --check lib/index.js && node --check lib/invariant.js`
- Tests (unit): `node --test tests/*.test.mjs`
- Load check: restart the harness and confirm the `codegraph_*` tools appear (out of scope for this repo's own checks; the packaging change is what this spec can prove).

</context>

<scope>

## In scope

- Widen the `peerDependencies` union on each of the five `@deepseek-ai` packages to include `0.2.1-rc.1` and `0.2.1-rc.2`.
- Keep the existing `ctx.shell.execute()` fix in `lib/index.js` and commit it with this change.
- Bump the fork version to `1.0.4`.
- Update the README's "why this fork exists" paragraph to state the new supported range and the shell call.
- Add `tests/peers.test.mjs` so the peer union, the shell call, and the version are checkable without a harness restart.
- Add `ua-checks.yaml` so the run's verifier nodes have declared commands.
- Add `.gitignore` entries for the run's own state.

## Out of scope

- Changing tool names, descriptions, argv building, timeouts, or rendering.
- Adding or upgrading dependencies, including the `codegraph` CLI.
- Publishing to npm; the package is installed from GitHub.
- Editing `profiles/web` wiring or `compatibility.json` exemptions.

## Boundaries

- Always: keep the five peer package names and the bundle patch path; run the syntax check and the tests before every commit.
- Ask first: changing the tool surface, adding a dependency, touching profile wiring, or granting a compatibility exemption.
- Never: force-push, write run state by hand, or merge without the recorded approval.

</scope>

<requirements>

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| R1 | Each of the five `@deepseek-ai/dsh-*` peer unions contains `0.2.1-rc.1` and `0.2.1-rc.2`. | must |
| R2 | `lib/index.js` contains no `ctx.shell.run(` call and does call `ctx.shell.execute(`. | must |
| R3 | `package.json` version is `1.0.4`. | must |
| R4 | The README states support through `0.2.1-rc.2` and names the `ctx.shell.execute()` call. | must |
| R5 | `tests/peers.test.mjs` fails if R1, R2, R3, or R4 regress. | must |
| R6 | `ua-checks.yaml` declares the checks the delivery graph reads, with no suppressed rules. | should |
| R7 | The repository's exports, bundle patch, and tool definitions are unchanged. | must |

</requirements>

<verification>

## Success criteria

| ID | Criterion | How it is checked |
|----|-----------|-------------------|
| SC1 | Peer unions name `0.2.1-rc.1` and `0.2.1-rc.2` for every dsh peer. | `node --test tests/peers.test.mjs` |
| SC2 | The shell call uses `execute()` and no `run()` remains. | `node --test tests/peers.test.mjs` and `node --check lib/index.js` |
| SC3 | Version and README agree with the change. | `node --test tests/peers.test.mjs` |
| SC4 | The fork still mounts the same way: manifest name, bundle patch, exports and tool definitions unchanged. | `git diff cc27c91..HEAD -- package.json cordis.patch.yml lib/index.js` shows only peers, version and the shell call. |
| SC5 | The change is delivered as a pull request with its checks and review evidence, ready for a person to merge. | The graph's `pr_open`, `ci`, `reviews` and `ship` nodes. |

</verification>

<open_questions>

## Open questions

- None.

</open_questions>

<revisions>

## Revisions

Appended by `ultragentic docs revise <this file> "<what changed>"`. Do not edit dates by hand.

| Date | Change |
|------|--------|
| 2026-10-18 | Created. |
| 2026-10-18 | SC4 and SC5 were authored as merge-time observations; the auto path stops at a green pull request (merge is not opted in) and a live reload would require restarting the harness mid-run. Both now state artifact and delivery properties observable before merge; the reload stays a post-merge note on the PR. |

</revisions>
