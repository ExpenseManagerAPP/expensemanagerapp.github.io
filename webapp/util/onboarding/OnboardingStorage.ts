import Storage from "sap/ui/util/Storage";

const SEEN_KEY = "tutorialSeen";
const storage = new Storage(Storage.Type.local, "expenseManager");

/**
 * Remembers whether the guided tour was already concluded, so it opens on its
 * own only once (the first time the user has no person registered). Reopening
 * it from the "?" shortcut does not reset the flag; only `reset()` does.
 */
export class OnboardingStorage {

    public static hasSeen(): boolean {
        return storage.get(SEEN_KEY) === true;
    }

    public static markSeen(): void {
        storage.put(SEEN_KEY, true);
    }

    public static reset(): void {
        storage.remove(SEEN_KEY);
    }

}
