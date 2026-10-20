sap.ui.define(["sap/ui/core/Fragment", "../../util/onboarding/OnboardingStorage", "../../util/feedback"], function (Fragment, ____util_onboarding_OnboardingStorage, ____util_feedback) {
  "use strict";

  const OnboardingStorage = ____util_onboarding_OnboardingStorage["OnboardingStorage"];
  const showToast = ____util_feedback["showToast"];
  /**
   * Guided tour shown to users who have no person registered yet (and reopenable
   * from the empty state or the "?" shortcut in the header). It is a wizard whose
   * steps explain the whole flow: person, card, category, expense, fixed expense,
   * the closing-day rule, invoices, the e-mail notice, debts, liability
   * movements and the backup.
   *
   * The step's action buttons minimize the dialog (instead of closing it), so the
   * user can perform the action on the page and reopen the tour where it stopped
   * from the floating button. The current step is persisted in localStorage.
   *
   * The closing-day rule explained in step 7 mirrors the backend logic in
   * `srv/services/person/implementation.ts` (`calculateBillingCycle`); if that
   * rule changes, the step text must follow.
   *
   * @returns {Dialog | undefined} the tour dialog, when the fragment is loaded
   */
  function dialogOf() {
    return Fragment.byId("Onboarding", "onboardingDialog");
  }

  /**
   * @returns {XMLView | undefined} the view that owns the dialog
   */
  function viewOf() {
    return dialogOf()?.getParent();
  }

  /**
   * @returns {Home} the Home controller that owns the tour dialog
   */
  function homeOf() {
    return viewOf()?.getController();
  }

  /**
   * @returns {Wizard | undefined} the tour wizard
   */
  function wizardOf() {
    return Fragment.byId("Onboarding", "onboardingWizard");
  }

  /** Minimizes the tour: closes the dialog but keeps it resumable. */
  function minimizeDialog() {
    homeOf().minimizeTutorial();
  }
  const Onboarding = {
    /**
     * Keeps `beforeOpen` free of DOM-dependent work; the actual step restore
     * happens in `onDialogAfterOpen`, once the wizard is rendered and visible.
     */
    onDialogBeforeOpen: function () {
      // intentionally empty: restoring the step needs the rendered wizard
    },
    /**
     * Restores the saved step once the dialog is open. The saved step must be
     * read *before* discarding progress: discarding fires `stepActivate` for
     * the first step, which would otherwise overwrite the saved position.
     *
     * The Wizard only allows moving to steps already reached, so progress is
     * discarded to the first step and then advanced step by step up to the
     * saved index.
     */
    onDialogAfterOpen: function () {
      const wizard = wizardOf();
      const steps = wizard?.getSteps();
      if (!wizard || !steps || steps.length === 0) {
        return;
      }
      const target = Math.min(OnboardingStorage.loadStep(), steps.length - 1);
      wizard.discardProgress(steps[0], true);
      if (target <= 0) {
        OnboardingStorage.saveStep(0);
        return;
      }
      OnboardingStorage.saveStep(target);
      const advance = remaining => {
        if (remaining <= 0) {
          return;
        }
        setTimeout(() => {
          wizard.nextStep();
          advance(remaining - 1);
        }, 0);
      };
      advance(target);
    },
    /**
     * Persists the current step whenever the wizard activates a new one.
     *
     * @param {object} event the wizard's stepActivate event
     */
    onStepActivate: function (event) {
      const wizard = wizardOf();
      if (!wizard) {
        return;
      }

      // The event carries the activated step; fall back to the wizard's own
      // progress index when it is missing, so a step change is never lost.
      const step = event.getParameter?.("step");
      const steps = wizard.getSteps() ?? [];
      const index = step ? steps.indexOf(step) : wizard.getProgress();
      if (index >= 0) {
        OnboardingStorage.saveStep(index);
      }
    },
    /**
     * Minimizes the tour without marking it as seen, so the user can act on the
     * page and resume it later from the floating button.
     */
    onCloseTutorial: function () {
      minimizeDialog();
    },
    /** Marks the tour as seen, closes it and confirms to the user. */
    onFinishTutorial: function () {
      const view = viewOf();
      dialogOf()?.close();
      homeOf().endTutorial();
      OnboardingStorage.markSeen();
      const ui = view?.getModel("ui");
      ui?.setProperty("/tutorialSeen", true);
      if (view) {
        showToast(view, "tutorialFinishedToast");
      }
    },
    /**
     * Minimizes the tour and opens the existing "create person" dialog.
     */
    onOpenPersonDialog: function () {
      const home = homeOf();
      minimizeDialog();
      home.onOpenPersonDialog();
    },
    /** Minimizes the tour and opens the existing "add expense" dialog. */
    onOpenExpenseDialog: function () {
      const home = homeOf();
      minimizeDialog();
      home.onOpenExpenseDialog();
    },
    /** Minimizes the tour and opens the existing backup dialog. */
    onOpenBackupDialog: function () {
      const home = homeOf();
      minimizeDialog();
      home.onRestoreBackup();
    },
    /** Minimizes the tour and navigates to the Cards tab. */
    onGoToCards: function () {
      const home = homeOf();
      minimizeDialog();
      home.navToWorkspace("Cards");
    },
    /** Minimizes the tour and navigates to the Categories tab. */
    onGoToCategories: function () {
      const home = homeOf();
      minimizeDialog();
      home.navToWorkspace("Categories");
    },
    /** Minimizes the tour and navigates to the Invoices tab. */
    onGoToInvoices: function () {
      const home = homeOf();
      minimizeDialog();
      home.navToWorkspace("Invoices");
    },
    /** Minimizes the tour and navigates to the Liabilities (debts) tab. */
    onGoToDebts: function () {
      const home = homeOf();
      minimizeDialog();
      home.navToWorkspace("Liabilities");
    },
    /** Minimizes the tour and navigates to the Overview tab. */
    onGoToOverview: function () {
      const home = homeOf();
      minimizeDialog();
      home.navToWorkspace("Home");
    }
  };
  return Onboarding;
});
//# sourceMappingURL=Onboarding-dbg.js.map
