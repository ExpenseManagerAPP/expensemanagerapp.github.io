import Router from "sap/m/routing/Router";

/**
 * Decides, for the route about to be shown, whether another route must be
 * shown instead (e.g. the login page). Returns null to let the route through.
 */
export type RouteGuard = (routeName: string) => string | null;

/**
 * Router that checks a guard before parsing a hash. Unlike a
 * beforeRouteMatched handler, a redirect here happens before any target is
 * created or displayed, so protected views never render for a user who may
 * not see them.
 *
 * @namespace apps.dflc.expensemanager.routing
 */
export default class AppRouter extends Router {

    private guard: RouteGuard | null = null;

    public setGuard(guard: RouteGuard): void {
        this.guard = guard;
    }

    public parse(hash: string): void {
        const routeName = this.getRouteInfoByHash(hash)?.name ?? "";
        const redirect = this.guard?.(routeName);

        if (redirect && redirect !== routeName) {
            this.navTo(redirect, {}, true);
            return;
        }

        super.parse(hash);
    }

}
