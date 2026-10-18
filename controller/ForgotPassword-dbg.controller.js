sap.ui.define(["./AccountPage", "../auth/AuthenticationService"], function (___AccountPage, ___auth_AuthenticationService) {
  "use strict";

  const AccountPage = ___AccountPage["AccountPage"];
  const AuthenticationService = ___auth_AuthenticationService["AuthenticationService"];
  /**
   * Asks for a password reset link. The answer is the same whether or not the
   * e-mail has an account.
   */
  class ForgotPassword extends AccountPage {
    async onSend() {
      const email = this.accountModel.getProperty("/email").trim();
      if (!this.validate({
        email: this.isEmail(email)
      })) {
        return;
      }
      await this.submit(async () => {
        await AuthenticationService.requestPasswordReset(email);
        this.accountModel.setData({
          ...this.initialState(),
          done: true,
          doneMessage: this.getText("forgotSent", [email])
        });
      });
    }
    initialState() {
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
  return ForgotPassword;
});
//# sourceMappingURL=ForgotPassword-dbg.controller.js.map
