import MessageToast from "sap/m/MessageToast";
import type { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import { AccountPage, MIN_PASSWORD_LENGTH } from "./AccountPage";
import { AuthenticationService } from "../auth/AuthenticationService";

/**
 * New password from the e-mail link (#/reset-password/{token}); on success
 * the user is signed in.
 */
export default class ResetPassword extends AccountPage {

    private token = "";

    public async onSave(): Promise<void> {
        const next = this.accountModel.getProperty("/next") as string;
        const confirm = this.accountModel.getProperty("/confirm") as string;

        if (!this.validate({ next: next.length >= MIN_PASSWORD_LENGTH, confirm: next === confirm })) {
            return;
        }

        const saved = await this.submit(() => AuthenticationService.resetPassword(this.token, next));

        if (saved) {
            this.resetPage();
            MessageToast.show(this.getText("resetDone"));
            this.navTo("Home");
        }
    }

    protected onPageInit(): void {
        this.getRouter().getRoute("ResetPassword")?.attachPatternMatched((event: Route$PatternMatchedEvent) => {
            this.token = (event.getParameter("arguments") as { token?: string }).token ?? "";
            this.resetPage();
        });
    }

    protected initialState(): object {
        return {
            next: "",
            confirm: "",
            nextState: "None",
            confirmState: "None",
            error: "",
            busy: false
        };
    }

}
