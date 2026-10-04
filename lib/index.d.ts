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
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import type { TimeoutKind } from './tools.ts';
/** Cordis plugin name. */
export declare const name = "tool-codegraph";
/** Services the plugin needs on its context. */
export declare const inject: string[];
/** Plugin config shape (composition entry config). */
export interface Config {
    /** Binary name or path of the codegraph CLI. */
    executable?: string;
    /** Timeout for regular (light) commands, ms. */
    queryTimeoutMs?: number;
    /** Timeout for index-building commands (sync), ms. */
    initTimeoutMs?: number;
}
export declare const Config: z<Config>;
/** Config with every default applied. */
export interface ResolvedConfig {
    executable: string;
    queryTimeoutMs: number;
    initTimeoutMs: number;
}
/** Resolve the configured timeout for one tool timeout kind. */
export declare function resolveTimeout(kind: TimeoutKind, config: ResolvedConfig): number;
/** Expand a leading `~` and make the path absolute and normalized. */
export declare function canonicalPath(input: string): string;
/**
 * Shell command line for one invocation. The executable is a config value and
 * must be shell-escaped like every other dynamic fragment: single-quote escaping
 * (not double quotes) handles spaces AND keeps `$`, backticks and `"` inert.
 * The argv tokens arriving here are already quoteArg-ed by the tool specs.
 */
export declare function buildCommand(executable: string, argv: string[]): string;
/** Canonical value every codegraph tool returns from `execute`. */
export interface CodegraphResult {
    /** Constant discriminant of this package's tool outputs. */
    kind: 'codegraph';
    /** Full CLI command line that was run, executable included. */
    command: string;
    /** Working directory the command ran in; `null` when the session has no cwd. */
    workdir: string | null;
    /** Process exit code; `null` when it never exited (signal kill or spawn failure). */
    exitCode: number | null;
    /** Model-facing text for the run (output, markers, or an error envelope). */
    content: string;
}
/**
 * Output contract validated against every successful `execute` value. The
 * author-facing `required: true` annotations compile into the object's JSON
 * Schema `required` list, and the nullable fields are `oneOf` unions — a plain
 * `type: 'string'` would reject the canonical `null` workdir of a session
 * without a cwd (and `null` exitCode of a signal-killed run).
 */
export declare const CODEGRAPH_OUTPUT_SCHEMA: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
        readonly kind: {
            readonly type: "string";
            readonly const: "codegraph";
            readonly required: true;
        };
        readonly command: {
            readonly type: "string";
            readonly required: true;
        };
        readonly workdir: {
            readonly oneOf: readonly [{
                readonly type: "string";
            }, {
                readonly type: "null";
            }];
            readonly required: true;
        };
        readonly exitCode: {
            readonly oneOf: readonly [{
                readonly type: "integer";
            }, {
                readonly type: "null";
            }];
            readonly required: true;
        };
        readonly content: {
            readonly type: "string";
            readonly required: true;
        };
    };
};
/**
 * Cordis plugin entry: register the codegraph tools and the system-prompt
 * section. State lives only in this closure; nothing is registered beyond
 * `ctx.tools` / `ctx.systemPrompt`, and no background jobs are started.
 * @param ctx - Cordis context carrying the injected services.
 * @param config - entry config; cordis applies the schemastery defaults of
 *   {@link Config} before calling `apply`, so the `?? fallback` reads here are
 *   a defensive normalization for hosts that bypass it, not the primary path.
 */
export declare function apply(ctx: Context, config: Config): void;
