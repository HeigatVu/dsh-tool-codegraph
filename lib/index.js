import { homedir } from "node:os";
import { join, resolve } from "node:path";
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
//#region src/render.ts
/** Placeholder shown when a truncated stream has no recoverable spill file. */
const SPILL_UNAVAILABLE = "(unavailable)";
/** Model text for a successful run that produced no stdout at all. */
const NO_OUTPUT = "(no output)";
/**
* Marker appended when the executor truncated a stream and can name the file
* holding the complete output. `spillPath` is optional in the real
* `CollectedOutput`: truncation can occur without a safe spill path, so the
* marker degrades to an explicit placeholder instead of printing "undefined".
*/
const truncationMarker = (output) => {
	if (!output.truncated) return "";
	return `\n[output truncated; full output: ${output.spillPath ?? SPILL_UNAVAILABLE}]`;
};
/**
* Terminal call card for one codegraph invocation.
* @param action - CLI subcommand (first argv token), rendered as `codegraph <action>`.
* @param description - full CLI command line of the invocation.
* @param cwd - working directory the command runs in; omit when unknown.
* @returns the pending-state call card shown to the user.
*/
function buildCallCard(action, description, cwd) {
	return {
		card: "terminal",
		title: `codegraph ${action}`,
		description,
		cwd
	};
}
/** True when the failure looks like a missing codegraph binary. */
function detectBinaryNotFound(stderrText, exitCode) {
	if (exitCode === 127) return true;
	return /not found|missing|no such file/i.test(stderrText);
}
/** True when the failure looks like a missing/uninitialized index. */
function detectIndexMissing(stderrText) {
	return /not initialized/i.test(stderrText) || /\.codegraph\b/.test(stderrText);
}
/**
* Model-facing text extracted from a finished shell run. A zero exit code
* surfaces stdout (stderr is deliberately ignored there); anything else —
* including a signal kill with a null exit code — surfaces stderr plus
* actionable recovery markers, each on its own leading-newline line.
* @param result - completed shell run to summarize.
* @returns the text handed back to the model for this tool call.
*/
function extractModelText(result) {
	if (result.exitCode === 0) return (result.stdout.text.length > 0 ? result.stdout.text : NO_OUTPUT) + truncationMarker(result.stdout);
	const stderr = result.stderr.text;
	let text = stderr;
	if (detectBinaryNotFound(stderr, result.exitCode ?? 0)) text += "\n[Codegraph executable not found. Please install it or rely on grep (or similar) instead.]";
	if (detectIndexMissing(stderr)) text += "\n[Codegraph error: Index missing. Run codegraph_init first.]";
	return text;
}
//#endregion
//#region src/tools.ts
/**
* POSIX single-quote shell escaping: wraps the value in '…' and replaces every
* interior single quote with '\'' so the value survives shell joining intact.
*/
function quoteArg(value) {
	return `'${value.replaceAll("'", `'\\''`)}'`;
}
/** Type-safe factory erasing the concrete param type into CodegraphToolSpec. */
function defineSpec(spec) {
	return {
		name: spec.name,
		description: spec.description,
		parameters: spec.parameters,
		buildArgs: (params) => spec.buildArgs(params),
		timeout: spec.timeout
	};
}
/** All codegraph tools in registration order. */
const codegraphToolSpecs = [
	defineSpec({
		name: "codegraph_status",
		description: "Check index health and statistics. Run this once per session to confirm index freshness before querying.",
		parameters: {},
		buildArgs: () => ["status"],
		timeout: "query"
	}),
	defineSpec({
		name: "codegraph_sync",
		description: "Sync changes since the last index. Run this if the index is stale.",
		parameters: {},
		buildArgs: () => ["sync"],
		timeout: "init"
	}),
	defineSpec({
		name: "codegraph_search",
		description: "Find a symbol by name across the codebase (Light output).",
		parameters: { query: {
			type: "string",
			required: true,
			description: "Symbol name to look up."
		} },
		buildArgs: ({ query }) => [
			"query",
			quoteArg(query),
			"--json"
		],
		timeout: "query"
	}),
	defineSpec({
		name: "codegraph_explore",
		description: "PRIMARY tool for orienting. Explores an area by returning verbatim source code of relevant symbols and their call paths grouped by file.",
		parameters: { query: {
			type: "string",
			required: true,
			description: "Area or question to explore."
		} },
		buildArgs: ({ query }) => ["explore", quoteArg(query)],
		timeout: "query"
	}),
	defineSpec({
		name: "codegraph_callers",
		description: "Find all functions/methods that call a specific symbol. Unsound (may have false negatives). Do not use for exhaustive completeness.",
		parameters: { symbol: {
			type: "string",
			required: true,
			description: "Symbol name to look up."
		} },
		buildArgs: ({ symbol }) => ["callers", quoteArg(symbol)],
		timeout: "query"
	}),
	defineSpec({
		name: "codegraph_callees",
		description: "Find all functions/methods that a specific symbol calls.",
		parameters: { symbol: {
			type: "string",
			required: true,
			description: "Symbol name to look up."
		} },
		buildArgs: ({ symbol }) => ["callees", quoteArg(symbol)],
		timeout: "query"
	}),
	defineSpec({
		name: "codegraph_impact",
		description: "Analyze what code is affected by changing a symbol. Pre-rank blast radius before editing. depth is optional (default 2).",
		parameters: {
			symbol: {
				type: "string",
				required: true,
				description: "Symbol to change."
			},
			depth: {
				type: "number",
				description: "Blast-radius depth (default 2); flag added only when provided."
			}
		},
		buildArgs: ({ symbol, depth }) => [
			"impact",
			quoteArg(symbol),
			...depth !== void 0 ? ["--depth", String(depth)] : []
		],
		timeout: "query"
	}),
	defineSpec({
		name: "codegraph_node",
		description: "Get one symbol's details (source + caller/callee trail) or read a file with line numbers + dependents. Good for overloaded names.",
		parameters: { name: {
			type: "string",
			required: true,
			description: "Symbol name or file path."
		} },
		buildArgs: ({ name }) => ["node", quoteArg(name)],
		timeout: "query"
	}),
	defineSpec({
		name: "codegraph_files",
		description: "Show project file structure from the index.",
		parameters: {},
		buildArgs: () => ["files", "--json"],
		timeout: "query"
	}),
	defineSpec({
		name: "codegraph_affected",
		description: "Find test files affected by changed source files.",
		parameters: { files: {
			type: "array",
			required: true,
			items: { type: "string" },
			description: "Changed source files whose affected tests to find."
		} },
		buildArgs: ({ files }) => ["affected", ...files.map(quoteArg)],
		timeout: "query"
	})
];
//#endregion
//#region src/index.ts
/**
* CodeGraph navigation tools for DeepSeek Harness agents.
*
* The plugin registers ten independent agent tools (`codegraph_status`,
* `codegraph_sync`, `codegraph_search`, `codegraph_explore`,
* `codegraph_callers`, `codegraph_callees`, `codegraph_impact`,
* `codegraph_node`, `codegraph_files`, `codegraph_affected`). Every tool
* shells out to the local codegraph CLI (https://github.com/colbymchenry/codegraph)
* through `ctx.shell` and renders the result as a terminal call card plus
* model-facing text.
*
* A system-prompt section teaches the model the orientation-first workflow:
* status first; a missing index is the user's decision (the model tells the
* user to run `codegraph init` and keeps working with other tools meanwhile);
* sync when stale; then lookups; callers/callees/impact are accelerators, not
* exhaustive proofs — exhaustive searches fall back to grep.
*
* Execution follows the canonical-value flow: `execute` returns the structured
* `CodegraphResult` validated against `CODEGRAPH_OUTPUT_SCHEMA`, and the
* model-facing text is a pure projection of that value (`output.render`), so
* every consumer (model, UI, tests) reads the same canonical fact set.
*
* No background jobs: codegraph runs synchronously under the caller's
* AbortSignal; timeouts come from the plugin config.
*
* @module @ducvu/dsh-tool-codegraph
*/
/** Cordis plugin name. */
const name = "tool-codegraph";
/** Services the plugin needs on its context. */
const inject = [
	"shell",
	"tools",
	"systemPrompt"
];
const Config = z.object({
	executable: z.string().default("codegraph"),
	queryTimeoutMs: z.number().default(1e4),
	initTimeoutMs: z.number().default(6e4)
});
/** Resolve the configured timeout for one tool timeout kind. */
function resolveTimeout(kind, config) {
	return kind === "init" ? config.initTimeoutMs : config.queryTimeoutMs;
}
/** Expand a leading `~` and make the path absolute and normalized. */
function canonicalPath(input) {
	const home = homedir();
	const expanded = input === "~" || input.startsWith("~/") ? join(home, input.slice(1).replace(/^\/+/, "")) : input;
	return resolve(expanded);
}
/**
* Shell command line for one invocation. The executable is a config value and
* must be shell-escaped like every other dynamic fragment: single-quote escaping
* (not double quotes) handles spaces AND keeps `$`, backticks and `"` inert.
* The argv tokens arriving here are already quoteArg-ed by the tool specs.
*/
function buildCommand(executable, argv) {
	return [quoteArg(executable), ...argv].join(" ");
}
/** System-prompt section text, verbatim contract of the tool catalog workflow. */
const CODEGRAPH_PROMPT = `CodeGraph Usage Rules:
- Workflow: ALWAYS check \`codegraph_status\` once per session first. If the index is missing, do NOT build it yourself — indexing is the user's decision: tell the user to run \`codegraph init\`, and continue with other tools meanwhile. If stale, run \`codegraph_sync\`.
- Orientation: Use \`codegraph_explore\` for mapping architecture or "how X works". Use \`codegraph_callers\` / \`codegraph_callees\` / \`codegraph_node\` for targeted lookups.
- Subagents: For deep exploration, spawn a subagent and explicitly instruct it to use \`codegraph_explore\` — its verbatim source blocks are heavy, so keep them out of the main session.
- DO NOT trust callers/callees/impact for completeness! They silently drop unresolved method/generic/trait-dispatch edges.
- For 100% accuracy (e.g., finding ALL callers before a rename or signature change), use \`grep\` or similar. Codegraph is only an accelerator.
- Overloaded names: Do not query overloaded names with bare callers/callees. Use \`codegraph_node\` on a specific symbol ID or use grep.`;
/**
* Output contract validated against every successful `execute` value. The
* author-facing `required: true` annotations compile into the object's JSON
* Schema `required` list, and the nullable fields are `oneOf` unions — a plain
* `type: 'string'` would reject the canonical `null` workdir of a session
* without a cwd (and `null` exitCode of a signal-killed run).
*/
const CODEGRAPH_OUTPUT_SCHEMA = {
	type: "object",
	additionalProperties: false,
	properties: {
		kind: {
			type: "string",
			const: "codegraph",
			required: true
		},
		command: {
			type: "string",
			required: true
		},
		workdir: {
			oneOf: [{ type: "string" }, { type: "null" }],
			required: true
		},
		exitCode: {
			oneOf: [{ type: "integer" }, { type: "null" }],
			required: true
		},
		content: {
			type: "string",
			required: true
		}
	}
};
/**
* First content block of a completed tool result, when it is plain text.
* `presentResult` sees only the durable content projection, and codegraph
* results always render as a single text block; anything else (future block
* kinds, empty content) degrades to an empty card output.
*/
function textOf(result) {
	const block = result.content[0];
	return block !== void 0 && block.type === "text" ? block.text : "";
}
/**
* Exit code carried in a tool result's presentation metadata, when present.
* `ToolResult.meta` is an opaque `JsonValue`, so the shape is narrowed via
* `in`/`typeof` with one local cast instead of trusting an untyped payload.
*/
function metaExitCode(meta) {
	if (typeof meta !== "object" || meta === null || !("exitCode" in meta)) return void 0;
	const value = meta.exitCode;
	return typeof value === "number" ? value : void 0;
}
/**
* Cordis plugin entry: register the codegraph tools and the system-prompt
* section. State lives only in this closure; nothing is registered beyond
* `ctx.tools` / `ctx.systemPrompt`, and no background jobs are started.
* @param ctx - Cordis context carrying the injected services.
* @param config - entry config; cordis applies the schemastery defaults of
*   {@link Config} before calling `apply`, so the `?? fallback` reads here are
*   a defensive normalization for hosts that bypass it, not the primary path.
*/
function apply(ctx, config) {
	const resolved = {
		executable: config.executable ?? "codegraph",
		queryTimeoutMs: config.queryTimeoutMs ?? 1e4,
		initTimeoutMs: config.initTimeoutMs ?? 6e4
	};
	/** Run one codegraph CLI command in the agent session's cwd and project it canonically. */
	const runCodegraph = async (argv, exec, timeout) => {
		const sessionCwd = exec.agent?.session.header.cwd;
		const workdir = sessionCwd === void 0 ? void 0 : canonicalPath(sessionCwd);
		const cmd = buildCommand(resolved.executable, argv);
		const failure = (cause) => ({
			kind: "codegraph",
			command: cmd,
			workdir: workdir ?? null,
			exitCode: null,
			content: `[Codegraph error: ${cause}]`
		});
		try {
			const result = await ctx.shell.run(ctx.shell.resolve({
				command: cmd,
				workdir,
				timeoutMs: timeout,
				signal: exec.signal
			}));
			if (result.aborted) return failure("call aborted");
			return {
				kind: "codegraph",
				command: cmd,
				workdir: workdir ?? null,
				exitCode: result.exitCode,
				content: extractModelText(result)
			};
		} catch (error) {
			return failure(error instanceof Error ? error.message : String(error));
		}
	};
	for (const spec of codegraphToolSpecs) ctx.tools.register(defineTool({
		name: spec.name,
		description: spec.description,
		parameters: spec.parameters,
		output: {
			schema: CODEGRAPH_OUTPUT_SCHEMA,
			render: (_args, value) => [{
				type: "text",
				text: value.content
			}],
			presentationMeta: (_args, value) => ({
				command: value.command,
				workdir: value.workdir,
				exitCode: value.exitCode
			})
		},
		execute: (args, exec) => runCodegraph(spec.buildArgs(args), exec, resolveTimeout(spec.timeout, resolved)),
		presentCall: (args) => {
			const argv = spec.buildArgs(args);
			return buildCallCard(argv[0] ?? "", buildCommand(resolved.executable, argv), void 0);
		},
		presentResult: (_args, result) => {
			const exitCode = metaExitCode(result.meta);
			return {
				card: "terminal",
				output: textOf(result),
				...exitCode !== void 0 ? { exitCode } : {}
			};
		}
	}));
	ctx.systemPrompt.section({
		name: "tool:codegraph",
		order: 110,
		text: CODEGRAPH_PROMPT
	});
}
//#endregion
export { CODEGRAPH_OUTPUT_SCHEMA, Config, apply, buildCommand, canonicalPath, inject, name, resolveTimeout };
