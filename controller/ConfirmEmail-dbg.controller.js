sap.ui.define(["sap/m/MessageToast", "./AccountPage", "../auth/AuthenticationService"], function (MessageToast, ___AccountPage, ___auth_AuthenticationService) {
  "use strict";

  const AccountPage = ___AccountPage["AccountPage"];
  const AuthenticationService = ___auth_AuthenticationService["AuthenticationService"];
  /**
   * Opened from the confirmation e-mail (#/confirm-email/{token}): activates the
   * account and signs the user in, or explains that the link is no longer valid.
   */
  class ConfirmEmail extends AccountPage {
    onPageInit() {
      this.getRouter().getRoute("ConfirmEmail")?.attachPatternMatched(event => {
        const token = event.getParameter("arguments").token ?? "";
        void this.confirm(token);
      });
    }
    initialState() {
      return {
        error: "",
        busy: false
      };
    }
    async confirm(token) {
      this.resetPage();
      const confirmed = await this.submit(() => AuthenticationService.confirmAccount(token));
      if (confirmed) {
        MessageToast.show(this.getText("confirmDone"));
        this.navTo("Home");
      }
    }
  }
  return ConfirmEmail;
});
//# sourceMappingURL=ConfirmEmail-dbg.controller.js.map
