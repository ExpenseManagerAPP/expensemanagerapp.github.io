import Storage from "sap/ui/util/Storage";

const SEEN_KEY = "tutorialSeen";
const STEP_KEY = "tutorialStep";
const ACTIVE_KEY = "tutorialActive";
const storage = new Storage(Storage.Type.local, "expenseManager");

/**
 * Remembers the guided tour state across sessions: whether it was already
 * concluded, which step the user stopped at (so it resumes where it left off)
 * and whether a tour is currently in progress (so the wizard can be reopened
 * from the floating "continue" button).
 *
 * Reopening it from the "?" shortcut does not reset the flags; only `reset()`
 * does. Concluding the tour via `markSeen()` clears the in-progress flag but
 * keeps the last step, so a manual rerun still resumes where it stopped.
 */
export class OnboardingStorage {

    public static hasSeen(): boolean {
        return storage.get(SEEN_KEY) === true;
    }

    public static markSeen(): void {
        storage.put(SEEN_KEY, true);
        storage.remove(ACTIVE_KEY);
    }

    public static reset(): void {
        storage.remove(SEEN_KEY);
        storage.remove(STEP_KEY);
        storage.remove(ACTIVE_KEY);
    }

    /**
     * The step index the user stopped at (0-based); 0 when none was saved.
     *
     * @returns {number} the saved step index
     */
    public static loadStep(): number {
        const step = storage.get(STEP_KEY) as number | null;
        return typeof step === "number" && step >= 0 ? step : 0;
    }

    /**
     * Persists the step the user stopped at.
     *
     * @param {number} step the 0-based step index
     */
    public static saveStep(step: number): void {
        storage.put(STEP_KEY, step);
    }

    /**
     * Whether a tour was left in progress (to be resumed from the shortcut).
     *
     * @returns {boolean} true when a tour is in progress
     */
    public static isActive(): boolean {
        return storage.get(ACTIVE_KEY) === true;
    }

    public static markActive(): void {
        storage.put(ACTIVE_KEY, true);
    }

    public static markInactive(): void {
        storage.remove(ACTIVE_KEY);
    }

}
