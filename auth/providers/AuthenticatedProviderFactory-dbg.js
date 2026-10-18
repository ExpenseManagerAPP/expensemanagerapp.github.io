sap.ui.define(["../../util/Environment", "./AppAuthenticationProvider", "./MockAuthenticationProvider", "../AuthApi"], function (__Environment, ___AppAuthenticationProvider, ___MockAuthenticationProvider, ___AuthApi) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const Environment = _interopRequireDefault(__Environment);
  const EnvironmentType = __Environment["EnvironmentType"];
  const AppAuthenticationProvider = ___AppAuthenticationProvider["AppAuthenticationProvider"];
  const MockAuthenticationProvider = ___MockAuthenticationProvider["MockAuthenticationProvider"];
  const AuthApi = ___AuthApi["AuthApi"];
  class AuthenticatedProviderFactory {
    static create() {
      switch (Environment.current()) {
        case EnvironmentType.GITHUB:
          return new AppAuthenticationProvider();
        case EnvironmentType.LOCAL:
          return AuthApi.getConfig().auth ? new AppAuthenticationProvider() : new MockAuthenticationProvider();
        default:
          return new MockAuthenticationProvider();
      }
    }
  }
  var __exports = {
    __esModule: true
  };
  __exports.AuthenticatedProviderFactory = AuthenticatedProviderFactory;
  return __exports;
});
//# sourceMappingURL=AuthenticatedProviderFactory-dbg.js.map
