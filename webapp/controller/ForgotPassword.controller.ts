import { AccountPage } from "./AccountPage";
import { AuthenticationService } from "../auth/AuthenticationService";

/**
 * Asks for a password reset link. The answer is the same whether or not the
 * e-mail has an account.
 */
export default class ForgotPassword extends AccountPage {

    public async onSend(): Promise<void> {
        const email = (this.accountModel.getProperty("/email") as string).trim();

        if (!this.validate({ email: this.isEmail(email) })) {
            return;
        }

        await this.submit(async () => {
            await AuthenticationService.requestPasswordReset(email);
            this.accountModel.setData({ ...this.initialState(), done: true, doneMessage: this.getText("forgotSent", [email]) });
        });
    }

    protected initialState(): object {
        return {
            email: "",
            emailState: "None",
            done: false,
            doneMessage: "",
            error: "",
            busy: false
        };
    }

}
