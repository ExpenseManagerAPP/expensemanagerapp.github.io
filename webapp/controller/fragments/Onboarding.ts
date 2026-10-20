import Control from "sap/ui/core/Control";
import Dialog from "sap/m/Dialog";
import Wizard from "sap/m/Wizard";
import Fragment from "sap/ui/core/Fragment";
import XMLView from "sap/ui/core/mvc/XMLView";
import JSONModel from "sap/ui/model/json/JSONModel";
import { OnboardingStorage } from "../../util/onboarding/OnboardingStorage";
import { showToast } from "../../util/feedback";
import type Home from "../../controller/Home.controller";

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
function dialogOf(control: Control): Dialog {
    return control.getParent() as Dialog;
}

/**
 * @param {Control} control any control inside the dialog
 * @returns {XMLView} the view that owns the dialog
 */
function viewOf(control: Control): XMLView {
    return dialogOf(control).getParent() as XMLView;
}

/**
 * @param {Control} control any control inside the dialog
 * @returns {Home} the Home controller
 */
function homeOf(control: Control): Home {
    return viewOf(control).getController() as Home;
}

/**
 * @param {Control} control any control inside the dialog
 */
function closeDialog(control: Control): void {
    dialogOf(control).close();
}

const Onboarding = {

    /** Restarts the tour from the first step every time it is opened. */
    onDialogBeforeOpen: function (): void {
        const wizard = Fragment.byId("Onboarding", "onboardingWizard") as Wizard | undefined;
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
    onCloseTutorial: function (this: Control): void {
        closeDialog(this);
    },

    /**
     * Marks the tour as seen, closes it and confirms to the user.
     *
     * @param {Control} this the pressed button
     */
    onFinishTutorial: function (this: Control): void {
        const view = viewOf(this);
        closeDialog(this);
        OnboardingStorage.markSeen();
        const ui = view.getModel("ui") as JSONModel | undefined;
        ui?.setProperty("/tutorialSeen", true);
        showToast(view, "tutorialFinishedToast");
    },

    /** Closes the tour and opens the existing "create person" dialog. */
    onOpenPersonDialog: function (this: Control): void {
        closeDialog(this);
        homeOf(this).onOpenPersonDialog();
    },

    /** Closes the tour and opens the existing "add expense" dialog. */
    onOpenExpenseDialog: function (this: Control): void {
        closeDialog(this);
        homeOf(this).onOpenExpenseDialog();
    },

    /** Closes the tour and opens the existing backup dialog. */
    onOpenBackupDialog: function (this: Control): void {
        closeDialog(this);
        homeOf(this).onRestoreBackup();
    },

    /** Closes the tour and navigates to the Cards tab. */
    onGoToCards: function (this: Control): void {
        closeDialog(this);
        homeOf(this).navToWorkspace("Cards");
    },

    /** Closes the tour and navigates to the Categories tab. */
    onGoToCategories: function (this: Control): void {
        closeDialog(this);
        homeOf(this).navToWorkspace("Categories");
    },

    /** Closes the tour and navigates to the Invoices tab. */
    onGoToInvoices: function (this: Control): void {
        closeDialog(this);
        homeOf(this).navToWorkspace("Invoices");
    },

    /** Closes the tour and navigates to the Liabilities (debts) tab. */
    onGoToDebts: function (this: Control): void {
        closeDialog(this);
        homeOf(this).navToWorkspace("Liabilities");
    },

    /** Closes the tour and navigates to the Overview tab. */
    onGoToOverview: function (this: Control): void {
        closeDialog(this);
        homeOf(this).navToWorkspace("Home");
    }

};

export default Onboarding;
