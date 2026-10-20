sap.ui.define(["sap/m/Wizard", "sap/m/WizardRenderer"], function (Wizard, WizardRenderer) {
  "use strict";

  /**
   * A `sap.m.Wizard` that accepts more than the documented 8-step limit.
   *
   * The guided tour covers the whole flow (person, card, category, expense,
   * fixed expense, closing-day rule, invoices, e-mail notice, debts, liability
   * movements and the backup), which needs more than the 8 steps the framework
   * recommends. The base control refuses steps above that limit and logs an
   * error ("The Wizard is supposed to handle from 3 to 8 steps."), so this
   * subclass lifts the limit by overriding the two guards while keeping the
   * base behaviour otherwise intact (`_incrementStepCount` keeps the progress
   * navigator in sync).
   *
   * It is created with `sap.m.Wizard.extend` (and not a native ES `class
   * extends`), because UI5 builds the control metadata only through `extend`;
   * a plain subclass would not inherit the Wizard's properties and aggregations.
   *
   * See SAP/openui5 issue #3670 for the framework's own discussion of the limit.
   */
  const TutorialWizard = Wizard.extend("apps.dflc.expensemanager.control.TutorialWizard", {
    metadata: {
      library: "sap.m",
      defaultAggregation: "steps"
    },
    // Reuse the framework renderer: without it, the RenderManager would look
    // for a `TutorialWizardRenderer` by convention, fail, and fall back to a
    // synchronous XHR that logs a module-loading error.
    renderer: WizardRenderer,
    /**
     * Adds a step without the 8-step upper bound, keeping the base behaviour of
     * propagating the "show next button" context and counting the step.
     *
     * @param {sap.m.WizardStep} step the step to add
     * @returns {this} pointer to the control instance for chaining
     */
    addStep: function (step) {
      step.setWizardContext({
        bParentAllowsButtonShow: this.getShowNextButton()
      });
      this._incrementStepCount();
      this.addAggregation("steps", step);
      return this;
    },
    /**
     * @returns {boolean} always false: this wizard has no maximum step count
     */
    _isMaxStepCountReached: function () {
      return false;
    },
    /**
     * @returns {boolean} whether the step count is in the (minimum-only) range
     */
    _isStepCountInRange: function () {
      return this._getStepCount() >= 3;
    }
  });
  return TutorialWizard;
});
//# sourceMappingURL=TutorialWizard-dbg.js.map
