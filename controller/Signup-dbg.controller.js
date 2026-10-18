sap.ui.define(["./AccountPage", "../auth/AuthenticationService"], function (___AccountPage, ___auth_AuthenticationService) {
  "use strict";

  const AccountPage = ___AccountPage["AccountPage"];
  const MIN_PASSWORD_LENGTH = ___AccountPage["MIN_PASSWORD_LENGTH"];
  const AuthenticationService = ___auth_AuthenticationService["AuthenticationService"];
  /**
   * Account creation. Depending on the server, the account is confirmed by an
   * e-mail link or waits for an admin's approval; the page says which.
   */
  class Signup extends AccountPage {
    async onCreate() {
      const {
        name,
        email,
        password,
        confirm
      } = this.accountModel.getData();
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
        const message = status === "confirmation_sent" ? this.getText("signupConfirmationSent", [email.trim()]) : this.getText("signupPendingApproval");
        this.accountModel.setData({
          ...this.initialState(),
          done: true,
          doneMessage: message
        });
      });
    }
    initialState() {
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
  return Signup;
});
//# sourceMappingURL=Signup-dbg.controller.js.map
