sap.ui.define(["sap/m/MessageToast", "./AccountPage", "../auth/AuthenticationService"], function (MessageToast, ___AccountPage, ___auth_AuthenticationService) {
  "use strict";

  const AccountPage = ___AccountPage["AccountPage"];
  const MIN_PASSWORD_LENGTH = ___AccountPage["MIN_PASSWORD_LENGTH"];
  const AuthenticationService = ___auth_AuthenticationService["AuthenticationService"];
  /**
   * New password from the e-mail link (#/reset-password/{token}); on success
   * the user is signed in.
   */
  class ResetPassword extends AccountPage {
    token = "";
    async onSave() {
      const next = this.accountModel.getProperty("/next");
      const confirm = this.accountModel.getProperty("/confirm");
      if (!this.validate({
        next: next.length >= MIN_PASSWORD_LENGTH,
        confirm: next === confirm
      })) {
        return;
      }
      const saved = await this.submit(() => AuthenticationService.resetPassword(this.token, next));
      if (saved) {
        this.resetPage();
        MessageToast.show(this.getText("resetDone"));
        this.navTo("Home");
      }
    }
    onPageInit() {
      this.getRouter().getRoute("ResetPassword")?.attachPatternMatched(event => {
        this.token = event.getParameter("arguments").token ?? "";
        this.resetPage();
      });
    }
    initialState() {
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
  return ResetPassword;
});
//# sourceMappingURL=ResetPassword-dbg.controller.js.map
