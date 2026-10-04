//#region src/invariant.ts
const PACKAGE_NAME = "@ducvu/dsh-tool-codegraph";
/** Cordis companion plugin name. */
const name = "tool-codegraph-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
const install = () => {};
/**
* Register this package's invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
