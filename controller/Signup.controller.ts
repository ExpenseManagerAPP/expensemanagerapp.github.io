import { AccountPage, MIN_PASSWORD_LENGTH } from "./AccountPage";
import { AuthenticationService } from "../auth/AuthenticationService";

interface SignupForm {
    name: string;
    email: string;
    password: string;
    confirm: string;
}

/**
 * Account creation. Depending on the server, the account is confirmed by an
 * e-mail link or waits for an admin's approval; the page says which.
 */
export default class Signup extends AccountPage {

    public async onCreate(): Promise<void> {
        const { name, email, password, confirm } = this.accountModel.getData() as SignupForm;

        const valid = this.validate({
            name: !!name.trim(),
            email: this.isEmail(email),
            password: password.length >= MIN_PASSWORD_LENGTH,
            confirm: password === confirm
        });

        if (!valid) {
            return;
        }

        await this.submit(async () => {
            const status = await AuthenticationService.signUp(email.trim(), name.trim(), password);
            const message = status === "confirmation_sent"
                ? this.getText("signupConfirmationSent", [email.trim()])
                : this.getText("signupPendingApproval");

            this.accountModel.setData({ ...this.initialState(), done: true, doneMessage: message });
        });
    }

    protected initialState(): object {
        return {
            name: "",
            email: "",
            password: "",
            confirm: "",
            nameState: "None",
            emailState: "None",
            passwordState: "None",
            confirmState: "None",
            done: false,
            doneMessage: "",
            error: "",
            busy: false
        };
    }

}
