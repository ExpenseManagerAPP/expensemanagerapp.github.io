sap.ui.define([], function () {
  "use strict";

  /** Routes for visitors without a session (a signed-in user goes to the start page instead). */
  const GUEST_ROUTES = ["Login", "Signup", "ForgotPassword"];

  /** Routes opened from e-mail links: they work with or without a session. */
  const EMAIL_LINK_ROUTES = ["ConfirmEmail", "ResetPassword"];

  /** Routes shown outside the workspace shell (no person, no tabs). */
  const OUTSIDE_WORKSPACE_ROUTES = [...GUEST_ROUTES, ...EMAIL_LINK_ROUTES, "ChangePassword", "Admin"];
  var __exports = {
    __esModule: true
  };
  __exports.GUEST_ROUTES = GUEST_ROUTES;
  __exports.EMAIL_LINK_ROUTES = EMAIL_LINK_ROUTES;
  __exports.OUTSIDE_WORKSPACE_ROUTES = OUTSIDE_WORKSPACE_ROUTES;
  return __exports;
});
//# sourceMappingURL=routes-dbg.js.map
