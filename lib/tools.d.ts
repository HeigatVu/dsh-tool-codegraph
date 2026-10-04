/**
 * Catalog of the codegraph agent tools: names, model-facing descriptions,
 * parameter schemas, CLI argv builders and timeout kinds. Pure data — no
 * context, no shell. The CLI is the open-source codegraph binary
 * (https://github.com/colbymchenry/codegraph) wrapped by this plugin.
 * @module @ducvu/dsh-tool-codegraph/tools
 */
import type { ParameterSchemaSpec } from '@deepseek-ai/dsh-tools';
/** Which configured timeout a tool uses (see plugin Config). */
export type TimeoutKind = 'query' | 'init';
/**
 * POSIX single-quote shell escaping: wraps the value in '…' and replaces every
 * interior single quote with '\'' so the value survives shell joining intact.
 */
export declare function quoteArg(value: string): string;
/** Parameter shapes per tool. */
export interface SearchParams {
    query: string;
}
export interface ExploreParams {
    query: string;
}
export interface CallersParams {
    symbol: string;
}
export interface CalleesParams {
    symbol: string;
}
export interface ImpactParams {
    symbol: string;
    depth?: number;
}
export interface NodeParams {
    name: string;
}
export interface AffectedParams {
    files: string[];
}
/** Erased per-tool spec stored in the registry. */
export interface CodegraphToolSpec {
    /** Registered tool name, e.g. `codegraph_search`. */
    readonly name: string;
    /** Model-facing description (English, verbatim from the catalog table). */
    readonly description: string;
    /** dsh-tools parameter schema validating the tool input before buildArgs. */
    readonly parameters: ParameterSchemaSpec;
    /** Build CLI argv after the executable; dynamic values are quoteArg-ed. */
    buildArgs(params: unknown): string[];
    /** Which configured timeout applies to this tool. */
    readonly timeout: TimeoutKind;
}
/** All codegraph tools in registration order. */
export declare const codegraphToolSpecs: readonly CodegraphToolSpec[];
