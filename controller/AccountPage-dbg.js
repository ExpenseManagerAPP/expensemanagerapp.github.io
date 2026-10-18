sap.ui.define(["sap/ui/model/json/JSONModel", "./BaseController", "../auth/AuthApi"], function (JSONModel, ___BaseController, ___auth_AuthApi) {
  "use strict";

  const BaseController = ___BaseController["BaseController"];
  const AuthRequestError = ___auth_AuthApi["AuthRequestError"];
  const MIN_PASSWORD_LENGTH = 8;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const ACCOUNT_ERRORS = {
    invalid_email: "accountInvalidEmail",
    invalid_name: "accountInvalidName",
    weak_password: "changePasswordWeak",
    invalid_link: "accountInvalidLink",
    too_many_attempts: "loginTooManyAttempts",
    backend_unavailable: "backendUnavailableLogin"
  };

  /**
   * Base of the account pages outside the workspace (sign-up, password reset,
   * e-mail confirmation): an "account" model with the form, busy flag and
   * error message, plus the shared validation and error texts.
   */
  class AccountPage extends BaseController {
    onInit() {
      this.accountModel = new JSONModel(this.initialState());
      this.getView()?.setModel(this.accountModel, "account");
      this.onPageInit();
    }
    onBackToLogin() {
      this.resetPage();
      this.navTo("Login");
    }
    onPageInit() {
      // optional hook
    }
    resetPage() {
      this.accountModel.setData(this.initialState());
    }

    /**
     * Runs a request with the busy indicator, showing its error on the page.
     *
     * @param {() => Promise<void>} action the request
     * @returns {Promise<boolean>} true when it succeeded
     */
    async submit(action) {
      this.accountModel.setProperty("/error", "");
      this.accountModel.setProperty("/busy", true);
      try {
        await action();
        return true;
      } catch (error) {
        const key = error instanceof AuthRequestError ? ACCOUNT_ERRORS[error.code] ?? "loginFailed" : "loginFailed";
        this.accountModel.setProperty("/error", this.getText(key));
        return false;
      } finally {
        this.accountModel.setProperty("/busy", false);
      }
    }

    /**
     * Marks each field as valid or not (its "<field>State" property).
     *
     * @param {Record<string, boolean>} checks validity per field
     * @returns {boolean} true when every field is valid
     */
    validate(checks) {
      Object.entries(checks).forEach(([field, valid]) => this.accountModel.setProperty(`/${field}State`, valid ? "None" : "Error"));
      return Object.values(checks).every(Boolean);
    }
    isEmail(value) {
      return EMAIL_PATTERN.test(value.trim());
    }
  }
  var __exports = {
    __esModule: true
  };
  __exports.MIN_PASSWORD_LENGTH = MIN_PASSWORD_LENGTH;
  __exports.AccountPage = AccountPage;
  return __exports;
});
//# sourceMappingURL=AccountPage-dbg.js.map
