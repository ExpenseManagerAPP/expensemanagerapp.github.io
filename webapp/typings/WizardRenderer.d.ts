/**
 * Minimal typings for the `sap/m/WizardRenderer` module, which ships with the
 * framework but is not part of the `@sapui5/types` package used by this app.
 *
 * It is needed by `apps/dflc/expensemanager/control/TutorialWizard` to reuse
 * the framework renderer instead of letting the RenderManager look for a
 * (non-existent) `TutorialWizardRenderer` by convention.
 */
declare module "sap/m/WizardRenderer" {
    /** A UI5 control renderer object (semantic rendering API, apiVersion 2). */
    const WizardRenderer: {
        apiVersion: number;
        render: (renderManager: unknown, wizard: unknown) => void;
    };

    export default WizardRenderer;
}
