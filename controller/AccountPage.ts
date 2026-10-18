import JSONModel from "sap/ui/model/json/JSONModel";
import { BaseController } from "./BaseController";
import { AuthRequestError } from "../auth/AuthApi";

export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ACCOUNT_ERRORS: Record<string, string> = {
    invalid_email: "accountInvalidEmail",
    invalid_name: "accountInvalidName",
    weak_password: "changePasswordWeak",
    invalid_link: "accountInvalidLink",
    too_many_attempts: "loginTooManyAttempts",
    backend_unavailable: "backendUnavailableLogin"
};

/**
 * Base of the account pages outside the workspace (sign-up, password reset,
 * e-mail confirmation): an "account" model with the form, busy flag and
 * error message, plus the shared validation and error texts.
 */
export abstract class AccountPage extends BaseController {

    protected accountModel: JSONModel;

    public onInit(): void {
        this.accountModel = new JSONModel(this.initialState());
        this.getView()?.setModel(this.accountModel, "account");
        this.onPageInit();
    }

    public onBackToLogin(): void {
        this.resetPage();
        this.navTo("Login");
    }

    protected abstract initialState(): object;

    protected onPageInit(): void {
        // optional hook
    }

    protected resetPage(): void {
        this.accountModel.setData(this.initialState());
    }

    /**
     * Runs a request with the busy indicator, showing its error on the page.
     *
     * @param {() => Promise<void>} action the request
     * @returns {Promise<boolean>} true when it succeeded
     */
    protected async submit(action: () => Promise<void>): Promise<boolean> {
        this.accountModel.setProperty("/error", "");
        this.accountModel.setProperty("/busy", true);

        try {
            await action();
            return true;
        } catch (error) {
            const key = error instanceof AuthRequestError ? ACCOUNT_ERRORS[error.code] ?? "loginFailed" : "loginFailed";
            this.accountModel.setProperty("/error", this.getText(key));
            return false;
        } finally {
            this.accountModel.setProperty("/busy", false);
        }
    }

    /**
     * Marks each field as valid or not (its "<field>State" property).
     *
     * @param {Record<string, boolean>} checks validity per field
     * @returns {boolean} true when every field is valid
     */
    protected validate(checks: Record<string, boolean>): boolean {
        Object.entries(checks).forEach(([field, valid]) => this.accountModel.setProperty(`/${field}State`, valid ? "None" : "Error"));

        return Object.values(checks).every(Boolean);
    }

    protected isEmail(value: string): boolean {
        return EMAIL_PATTERN.test(value.trim());
    }

}
