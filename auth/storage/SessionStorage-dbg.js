sap.ui.define(["sap/ui/util/Storage"], function (Storage) {
  "use strict";

  class SessionStorage {
    static STORAGE_KEY = "session";
    static sessions = new Storage(Storage.Type.local, "expenseManager");
    static save(session) {
      this.sessions.put(this.STORAGE_KEY, session);
    }
    static load() {
      const value = this.sessions.get(this.STORAGE_KEY);
      return value ?? null;
    }
    static clear() {
      this.sessions.remove(this.STORAGE_KEY);
    }
  }
  var __exports = {
    __esModule: true
  };
  __exports.SessionStorage = SessionStorage;
  return __exports;
});
//# sourceMappingURL=SessionStorage-dbg.js.map
