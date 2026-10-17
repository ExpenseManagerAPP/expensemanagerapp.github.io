sap.ui.define(["../storage/SessionStorage"], function (___storage_SessionStorage) {
  "use strict";

  const SessionStorage = ___storage_SessionStorage["SessionStorage"];
  class MockAuthenticationProvider {
    loginWithPassword(username) {
      return Promise.resolve({
        accessToken: "mock-token",
        expiresAt: Date.now() + 3600000,
        userName: username,
        role: "Admin"
      });
    }
    refresh() {
      return Promise.resolve(null);
    }
    changePassword(session) {
      return Promise.resolve({
        ...session,
        mustChangePassword: false
      });
    }
    logout() {
      SessionStorage.clear();
      return Promise.resolve();
    }
  }
  var __exports = {
    __esModule: true
  };
  __exports.MockAuthenticationProvider = MockAuthenticationProvider;
  return __exports;
});
//# sourceMappingURL=MockAuthenticationProvider-dbg.js.map
