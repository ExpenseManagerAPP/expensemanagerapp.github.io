import JSONModel from "sap/ui/model/json/JSONModel";
import type Input from "sap/m/Input";
import { BaseController } from "./BaseController";
import { AuthenticationService } from "../auth/AuthenticationService";
import { AuthRequestError } from "../auth/AuthApi";
import { LoginPreferences } from "../auth/storage/LoginPreferences";

const LOGIN_ERRORS: Record<string, string> = {
    invalid_credentials: "loginInvalidCredentials",
    too_many_attempts: "loginTooManyAttempts",
    missing_credentials: "loginRequired",
    backend_unavailable: "backendUnavailableLogin",
    account_pending: "loginAccountPending",
    account_disabled: "loginAccountDisabled"
};

interface LoginState {
    email: string;
    password: string;
}

export default class Login extends BaseController {

    private loginModel: JSONModel;

    public onInit(): void {
        this.loginModel = new JSONModel(this.initialState());
        this.getView()?.setModel(this.loginModel, "login");

        void AuthenticationService.isAuthenticated()
            .then((authenticated) => {
                if (authenticated) {
                    this.navTo(this.landingRoute());
                }
            })
            .catch(() => {
                this.showBackendUnavailable();
            });
    }

    public onTogglePassword(): void {
        this.loginModel.setProperty("/showPassword", !this.loginModel.getProperty("/showPassword"));
    }

    /**
     * Signs in with the e-mail and password typed on the page, without leaving the app.
     */
    public async onPasswordLogin(): Promise<void> {
        const { email, password } = this.loginModel.getData() as LoginState;

        if (!this.validate(email, password)) {
            return;
        }

        this.loginModel.setProperty("/error", "");
        this.loginModel.setProperty("/busy", true);

        try {
            await AuthenticationService.loginWithPassword(email.trim(), password);
            LoginPreferences.saveEmail(email.trim());
            this.loginModel.setData(this.initialState());
            this.navTo(this.landingRoute());
        } catch (error) {
            this.loginModel.setProperty("/password", "");
            this.loginModel.setProperty("/error", this.getText(this.errorKey(error)));
            (this.byId("loginPassword") as Input | undefined)?.focus();
        } finally {
            this.loginModel.setProperty("/busy", false);
        }
    }

    /**
     * Users created by an admin (or imported) must choose their own password first.
     */
    private landingRoute(): string {
        return AuthenticationService.mustChangePassword() ? "ChangePassword" : "Home";
    }

    private validate(email: string, password: string): boolean {
        const emailState = email.trim() ? "None" : "Error";
        const passwordState = password ? "None" : "Error";

        this.loginModel.setProperty("/emailState", emailState);
        this.loginModel.setProperty("/passwordState", passwordState);

        return emailState === "None" && passwordState === "None";
    }

    private errorKey(error: unknown): string {
        return error instanceof AuthRequestError ? LOGIN_ERRORS[error.code] ?? "loginFailed" : "loginFailed";
    }

    private initialState(): object {
        return {
            email: LoginPreferences.loadEmail(),
            password: "",
            showPassword: false,
            emailState: "None",
            passwordState: "None",
            error: "",
            busy: false
        };
    }

    /**
     * Surfaces backend unavailability on the Login page.
     */
    private showBackendUnavailable(): void {
        this.showErrorMessage("backendUnavailableLogin");
    }

}
