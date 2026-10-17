import JSONModel from "sap/ui/model/json/JSONModel";
import MessageToast from "sap/m/MessageToast";
import { BaseController } from "./BaseController";
import { AuthenticationService } from "../auth/AuthenticationService";
import { AuthRequestError } from "../auth/AuthApi";

const MIN_PASSWORD_LENGTH = 8;

const PASSWORD_ERRORS: Record<string, string> = {
    invalid_credentials: "changePasswordWrongCurrent",
    weak_password: "changePasswordWeak",
    too_many_attempts: "loginTooManyAttempts",
    invalid_token: "sessionExpiredMessage",
    backend_unavailable: "backendUnavailableLogin"
};

interface PasswordState {
    current: string;
    next: string;
    confirm: string;
}

/**
 * Mandatory password change for users who got a password from an admin
 * (or were imported without one). The services stay closed until it is done.
 */
export default class ChangePassword extends BaseController {

    private passwordModel: JSONModel;

    public onInit(): void {
        this.passwordModel = new JSONModel(this.initialState());
        this.getView()?.setModel(this.passwordModel, "password");
    }

    public async onSave(): Promise<void> {
        const { current, next, confirm } = this.passwordModel.getData() as PasswordState;

        if (!this.validate(current, next, confirm)) {
            return;
        }

        this.passwordModel.setProperty("/error", "");
        this.passwordModel.setProperty("/busy", true);

        try {
            await AuthenticationService.changePassword(current, next);
            this.passwordModel.setData(this.initialState());
            MessageToast.show(this.getText("changePasswordDone"));
            this.navTo("Home");
        } catch (error) {
            const key = error instanceof AuthRequestError ? PASSWORD_ERRORS[error.code] ?? "loginFailed" : "loginFailed";
            this.passwordModel.setProperty("/error", this.getText(key));
        } finally {
            this.passwordModel.setProperty("/busy", false);
        }
    }

    public async onLogout(): Promise<void> {
        await AuthenticationService.logout();
        this.passwordModel.setData(this.initialState());
        this.navTo("Login");
    }

    private validate(current: string, next: string, confirm: string): boolean {
        const states = {
            currentState: current ? "None" : "Error",
            nextState: next.length >= MIN_PASSWORD_LENGTH ? "None" : "Error",
            confirmState: next === confirm ? "None" : "Error"
        };

        Object.entries(states).forEach(([key, state]) => this.passwordModel.setProperty(`/${key}`, state));

        return Object.values(states).every((state) => state === "None");
    }

    private initialState(): object {
        return {
            current: "",
            next: "",
            confirm: "",
            currentState: "None",
            nextState: "None",
            confirmState: "None",
            error: "",
            busy: false
        };
    }

}
