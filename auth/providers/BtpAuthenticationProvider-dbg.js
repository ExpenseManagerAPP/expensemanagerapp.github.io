sap.ui.define(["../storage/SessionStorage"], function (___storage_SessionStorage) {
  "use strict";

  const SessionStorage = ___storage_SessionStorage["SessionStorage"];
  class BtpAuthenticationProvider {
    /**
     * On the BTP launchpad the managed app router authenticates the user,
     * so the password form simply opens the platform session.
     */
    loginWithPassword() {
      return Promise.resolve({
        accessToken: "btp-session-token",
        expiresAt: Date.now() + 3600000,
        userName: "Usuário BTP"
      });
    }
    refresh() {
      return Promise.resolve(null);
    }
    changePassword() {
      return Promise.reject(new Error("Password changes are managed by the platform"));
    }
    logout() {
      SessionStorage.clear();
      if (typeof window !== "undefined") {
        const redirectTarget = encodeURIComponent(window.location.href);
        window.location.assign(`${window.location.origin}/logout?redirect=${redirectTarget}`);
      }
      return Promise.resolve();
    }
  }
  var __exports = {
    __esModule: true
  };
  __exports.BtpAuthenticationProvider = BtpAuthenticationProvider;
  return __exports;
});
//# sourceMappingURL=BtpAuthenticationProvider-dbg.js.map
