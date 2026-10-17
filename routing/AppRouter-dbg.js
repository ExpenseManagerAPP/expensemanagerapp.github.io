sap.ui.define(["sap/m/routing/Router"], function (Router) {
  "use strict";

  /**
   * Decides, for the route about to be shown, whether another route must be
   * shown instead (e.g. the login page). Returns null to let the route through.
   */
  /**
   * Router that checks a guard before parsing a hash. Unlike a
   * beforeRouteMatched handler, a redirect here happens before any target is
   * created or displayed, so protected views never render for a user who may
   * not see them.
   *
   * @namespace apps.dflc.expensemanager.routing
   */
  const AppRouter = Router.extend("apps.dflc.expensemanager.routing.AppRouter", {
    constructor: function constructor() {
      Router.prototype.constructor.apply(this, arguments);
      this.guard = null;
    },
    setGuard: function _setGuard(guard) {
      this.guard = guard;
    },
    parse: function _parse(hash) {
      const routeName = this.getRouteInfoByHash(hash)?.name ?? "";
      const redirect = this.guard?.(routeName);
      if (redirect && redirect !== routeName) {
        this.navTo(redirect, {}, true);
        return;
      }
      Router.prototype.parse.call(this, hash);
    }
  });
  return AppRouter;
});
//# sourceMappingURL=AppRouter-dbg.js.map
