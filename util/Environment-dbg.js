sap.ui.define([], function () {
  "use strict";

  var EnvironmentType = /*#__PURE__*/function (EnvironmentType) {
    EnvironmentType["LOCAL"] = "LOCAL";
    EnvironmentType["GITHUB"] = "GITHUB";
    return EnvironmentType;
  }(EnvironmentType || {});
  class Environment {
    static current() {
      const host = window.location.hostname;
      if (host.includes("github.io")) {
        return EnvironmentType.GITHUB;
      }
      return EnvironmentType.LOCAL;
    }
  }
  Environment.EnvironmentType = EnvironmentType;
  return Environment;
});
//# sourceMappingURL=Environment-dbg.js.map
