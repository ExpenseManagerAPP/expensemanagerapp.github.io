sap.ui.define(["../storage/SessionStorage", "../AuthApi"], function (___storage_SessionStorage, ___AuthApi) {
  "use strict";

  const SessionStorage = ___storage_SessionStorage["SessionStorage"];
  const AuthApi = ___AuthApi["AuthApi"];
  /**
   * Signs in against the app's own Users through the CAP /auth API.
   */
  class AppAuthenticationProvider {
    loginWithPassword(username, password) {
      return AuthApi.loginWithPassword(username, password);
    }
    async refresh(session) {
      return session.refreshToken ? AuthApi.refresh(session.refreshToken) : null;
    }
    changePassword(session, currentPassword, newPassword) {
      return AuthApi.changePassword(session.accessToken, currentPassword, newPassword);
    }
    logout() {
      SessionStorage.clear();
      return Promise.resolve();
    }
  }
  var __exports = {
    __esModule: true
  };
  __exports.AppAuthenticationProvider = AppAuthenticationProvider;
  return __exports;
});
//# sourceMappingURL=AppAuthenticationProvider-dbg.js.map
