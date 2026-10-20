sap.ui.define(["sap/ui/util/Storage"], function (Storage) {
  "use strict";

  const SEEN_KEY = "tutorialSeen";
  const storage = new Storage(Storage.Type.local, "expenseManager");

  /**
   * Remembers whether the guided tour was already concluded, so it opens on its
   * own only once (the first time the user has no person registered). Reopening
   * it from the "?" shortcut does not reset the flag; only `reset()` does.
   */
  class OnboardingStorage {
    static hasSeen() {
      return storage.get(SEEN_KEY) === true;
    }
    static markSeen() {
      storage.put(SEEN_KEY, true);
    }
    static reset() {
      storage.remove(SEEN_KEY);
    }
  }
  var __exports = {
    __esModule: true
  };
  __exports.OnboardingStorage = OnboardingStorage;
  return __exports;
});
//# sourceMappingURL=OnboardingStorage-dbg.js.map
