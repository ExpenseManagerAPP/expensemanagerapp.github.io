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
   * The closing-day rule explained in step 7 mirrors the backend logic in
   * `srv/services/person/implementation.ts` (`calculateBillingCycle`); if that
   * rule changes, the step text must follow.
   *
   * @param {Control} control any control inside the dialog
   * @returns {Dialog} the owning dialog
   */
  function dialogOf(control) {
    return control.getParent();
  }

  /**
   * @param {Control} control any control inside the dialog
   * @returns {XMLView} the view that owns the dialog
   */
  function viewOf(control) {
    return dialogOf(control).getParent();
  }

  /**
   * @param {Control} control any control inside the dialog
   * @returns {Home} the Home controller
   */
  function homeOf(control) {
    return viewOf(control).getController();
  }

  /**
   * @param {Control} control any control inside the dialog
   */
  function closeDialog(control) {
    dialogOf(control).close();
  }
  const Onboarding = {
    /** Restarts the tour from the first step every time it is opened. */
    onDialogBeforeOpen: function () {
      const wizard = Fragment.byId("Onboarding", "onboardingWizard");
      const steps = wizard?.getSteps();
      if (wizard && steps && steps.length > 0) {
        wizard.discardProgress(steps[0], false);
      }
    },
    /**
     * Closes the tour without marking it as seen.
     *
     * @param {Control} this the pressed button
     */
    onCloseTutorial: function () {
      closeDialog(this);
    },
    /**
     * Marks the tour as seen, closes it and confirms to the user.
     *
     * @param {Control} this the pressed button
     */
    onFinishTutorial: function () {
      const view = viewOf(this);
      closeDialog(this);
      OnboardingStorage.markSeen();
      const ui = view.getModel("ui");
      ui?.setProperty("/tutorialSeen", true);
      showToast(view, "tutorialFinishedToast");
    },
    /** Closes the tour and opens the existing "create person" dialog. */
    onOpenPersonDialog: function () {
      closeDialog(this);
      homeOf(this).onOpenPersonDialog();
    },
    /** Closes the tour and opens the existing "add expense" dialog. */
    onOpenExpenseDialog: function () {
      closeDialog(this);
      homeOf(this).onOpenExpenseDialog();
    },
    /** Closes the tour and opens the existing backup dialog. */
    onOpenBackupDialog: function () {
      closeDialog(this);
      homeOf(this).onRestoreBackup();
    },
    /** Closes the tour and navigates to the Cards tab. */
    onGoToCards: function () {
      closeDialog(this);
      homeOf(this).navToWorkspace("Cards");
    },
    /** Closes the tour and navigates to the Categories tab. */
    onGoToCategories: function () {
      closeDialog(this);
      homeOf(this).navToWorkspace("Categories");
    },
    /** Closes the tour and navigates to the Invoices tab. */
    onGoToInvoices: function () {
      closeDialog(this);
      homeOf(this).navToWorkspace("Invoices");
    },
    /** Closes the tour and navigates to the Liabilities (debts) tab. */
    onGoToDebts: function () {
      closeDialog(this);
      homeOf(this).navToWorkspace("Liabilities");
    },
    /** Closes the tour and navigates to the Overview tab. */
    onGoToOverview: function () {
      closeDialog(this);
      homeOf(this).navToWorkspace("Home");
    }
  };
  return Onboarding;
});
//# sourceMappingURL=Onboarding-dbg.js.map
