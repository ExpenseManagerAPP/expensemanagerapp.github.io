import MessageToast from "sap/m/MessageToast";
import type { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import { AccountPage } from "./AccountPage";
import { AuthenticationService } from "../auth/AuthenticationService";

/**
 * Opened from the confirmation e-mail (#/confirm-email/{token}): activates the
 * account and signs the user in, or explains that the link is no longer valid.
 */
export default class ConfirmEmail extends AccountPage {

    protected onPageInit(): void {
        this.getRouter().getRoute("ConfirmEmail")?.attachPatternMatched((event: Route$PatternMatchedEvent) => {
            const token = (event.getParameter("arguments") as { token?: string }).token ?? "";
            void this.confirm(token);
        });
    }

    protected initialState(): object {
        return {
            error: "",
            busy: false
        };
    }

    private async confirm(token: string): Promise<void> {
        this.resetPage();

        const confirmed = await this.submit(() => AuthenticationService.confirmAccount(token));

        if (confirmed) {
            MessageToast.show(this.getText("confirmDone"));
            this.navTo("Home");
        }
    }

}
