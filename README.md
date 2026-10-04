# @ducvu/dsh-tool-codegraph

Local, editable fork of [`@m1khal3v/dsh-tool-codegraph`](https://github.com/m1khal3v/dsh-tool-codegraph)
v1.0.3 (MIT, © Anton Mikhalev — see [LICENSE](LICENSE)) owned by this repo.

It mounts the ten `codegraph_*` agent tools into DSH. Every tool shells out to
the local `codegraph` CLI (https://github.com/colbymchenry/codegraph) through
`ctx.shell`; the plugin itself contains no codegraph logic.

## Why this fork exists

- The npm plugin pins `peerDependencies` to `@deepseek-ai/* ^0.1.1-rc.1`, which
  dsh 0.2.0-rc.2 skips at boot unless an exact-version exemption is granted.
  This fork declares the dsh-automation-style peer lists (including
  `0.2.0-rc.2`) so no exemption is needed.
- Owning the source here means tool behavior (names, descriptions, argv
  building, timeouts, rendering) can be modified freely to match changes in the
  upstream codegraph CLI.

## Layout

- `lib/index.js` — compiled plugin entry (tools registration + system-prompt
  section). Plain ESM; edit directly, no build step.
- `lib/invariant.js` — package-ownership invariant companion.
- `lib/*.d.ts` — type declarations kept from upstream.
- `cordis.patch.yml` — bundle patch inserting the `tool-codegraph` entry.

## Wiring

`profiles/web/package.json` lists this directory as a `link:` dependency and
`@ducvu/dsh-tool-codegraph` in `dsh.profile.bundles`. Edits to `lib/*.js` take
effect after `systemctl --user restart deepseek-harness` — no `pnpm install`
needed (the link is a live symlink).

## Config (entry `tool-codegraph` in cordis.patch.yml)

- `executable` — codegraph binary name or path (default `codegraph`). Point it
  at a modified build that is not on PATH.
- `queryTimeoutMs` — timeout for light commands (default 10000).
- `initTimeoutMs` — timeout for index-building commands like `sync`
  (default 60000).
