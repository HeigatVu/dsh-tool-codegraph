/**
 * Result rendering for codegraph tool calls: the terminal call card shown to
 * the user and the model-facing text with actionable markers (missing binary,
 * missing index, truncated output). Pure functions only.
 * @module @ducvu/dsh-tool-codegraph/render
 */
import type { ShellRunResult } from '@deepseek-ai/dsh-shell';
import type { TerminalCallView, ToolResultView } from '@deepseek-ai/dsh-tools';
/**
 * Terminal call card for one codegraph invocation.
 * @param action - CLI subcommand (first argv token), rendered as `codegraph <action>`.
 * @param description - full CLI command line of the invocation.
 * @param cwd - working directory the command runs in; omit when unknown.
 * @returns the pending-state call card shown to the user.
 */
export declare function buildCallCard(action: string, description: string, cwd: string | undefined): TerminalCallView;
/** True when the failure looks like a missing codegraph binary. */
export declare function detectBinaryNotFound(stderrText: string, exitCode: number): boolean;
/** True when the failure looks like a missing/uninitialized index. */
export declare function detectIndexMissing(stderrText: string): boolean;
/**
 * Model-facing text extracted from a finished shell run. A zero exit code
 * surfaces stdout (stderr is deliberately ignored there); anything else —
 * including a signal kill with a null exit code — surfaces stderr plus
 * actionable recovery markers, each on its own leading-newline line.
 * @param result - completed shell run to summarize.
 * @returns the text handed back to the model for this tool call.
 */
export declare function extractModelText(result: ShellRunResult): string;
/**
 * Full tool result for a finished shell run: the completed terminal card
 * carrying the model text in `output` (the real `ToolResultView` union has no
 * `text` field) plus the exit code when the process exited.
 * @param result - completed shell run.
 * @param action - CLI subcommand (first argv token), rendered as
 *   `codegraph <action>`. Passed explicitly: the action is not derivable from
 *   `command`, whose first token is the executable.
 * @param command - full CLI command line of the invocation.
 * @param workdir - working directory the command ran in; the completed view
 *   cannot carry it, but the pending title is still derived through the call
 *   card built from it.
 * @returns the completed terminal card for the invocation.
 */
export declare function renderResult(result: ShellRunResult, action: string, command: string, workdir: string | undefined): ToolResultView;
/**
 * Tool result for a shell call that threw (timeout/abort/spawn failure): the
 * run produced no exit status, so the completed card carries only the error
 * text for the model.
 * @param action - CLI subcommand (first argv token), rendered as `codegraph <action>`.
 * @param command - full CLI command line of the invocation.
 * @param workdir - working directory the command was meant to run in.
 * @param cause - short reason string, e.g. `call aborted` on an aborted signal.
 * @returns the completed terminal card with the `[Codegraph error: …]` text.
 */
export declare function renderShellFailure(action: string, command: string, workdir: string | undefined, cause: string): ToolResultView;
