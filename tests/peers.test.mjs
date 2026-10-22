// Guards the two ways this fork silently stops loading on a newer harness:
// a peer range that does not name the running prerelease, and a shell call
// written against the pre-0.2.1 API.
//
// Run: node --test tests/peers.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFileSync(join(root, name), "utf8");
const manifest = JSON.parse(read("package.json"));

const DSH_PEERS = [
	"@deepseek-ai/dsh-agent",
	"@deepseek-ai/dsh-invariants",
	"@deepseek-ai/dsh-shell",
	"@deepseek-ai/dsh-system-prompt",
	"@deepseek-ai/dsh-tools"
];

// The 0.2.1 release candidates this fork claims on top of the upstream 0.2.0
// base. A new harness version needs a new entry here, on purpose.
const CLAIMED = ["0.2.1-rc.1", "0.2.1-rc.2"];

test("every dsh peer names the versions the fork claims", () => {
	const peers = manifest.peerDependencies ?? {};
	for (const name of DSH_PEERS) {
		const range = peers[name];
		assert.ok(range, `${name} missing from peerDependencies`);
		for (const version of CLAIMED) {
			assert.ok(
				range.includes(version),
				`${name} range "${range}" does not name ${version}`
			);
		}
		assert.ok(
			!range.includes("^") && !range.includes("~"),
			`${name} range "${range}" is open-ended; the fork pins exact prereleases`
		);
	}
});

test("the fork version moved past the upstream base", () => {
	assert.equal(manifest.name, "@ducvu/dsh-tool-codegraph");
	assert.equal(manifest.version, "1.0.4");
});

test("the shell call uses the 0.2.1 API", () => {
	const entry = read("lib/index.js");
	assert.ok(
		!entry.includes("ctx.shell.run("),
		"lib/index.js still calls ctx.shell.run(), removed in @deepseek-ai/dsh-shell 0.2.1"
	);
	assert.ok(
		entry.includes("ctx.shell.execute("),
		"lib/index.js does not call ctx.shell.execute()"
	);
});

test("the README claims the same support the manifest does", () => {
	const readme = read("README.md");
	assert.ok(
		readme.includes("0.2.1-rc.2"),
		"README does not name the newest supported harness"
	);
	assert.ok(
		readme.includes("execute()"),
		"README does not tell a reader which shell API the code targets"
	);
});
