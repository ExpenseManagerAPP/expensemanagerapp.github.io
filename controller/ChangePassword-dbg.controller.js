sap.ui.define(["sap/ui/model/json/JSONModel", "sap/m/MessageToast", "./BaseController", "../auth/AuthenticationService", "../auth/AuthApi"], function (JSONModel, MessageToast, ___BaseController, ___auth_AuthenticationService, ___auth_AuthApi) {
  "use strict";

  const BaseController = ___BaseController["BaseController"];
  const AuthenticationService = ___auth_AuthenticationService["AuthenticationService"];
  const AuthRequestError = ___auth_AuthApi["AuthRequestError"];
  const MIN_PASSWORD_LENGTH = 8;
  const PASSWORD_ERRORS = {
    invalid_credentials: "changePasswordWrongCurrent",
    weak_password: "changePasswordWeak",
    too_many_attempts: "loginTooManyAttempts",
    invalid_token: "sessionExpiredMessage",
    backend_unavailable: "backendUnavailableLogin"
  };
  /**
   * Mandatory password change for users who got a password from an admin
   * (or were imported without one). The services stay closed until it is done.
   */
  class ChangePassword extends BaseController {
    onInit() {
      this.passwordModel = new JSONModel(this.initialState());
      this.getView()?.setModel(this.passwordModel, "password");
    }
    async onSave() {
      const {
        current,
        next,
        confirm
      } = this.passwordModel.getData();
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
    async onLogout() {
      await AuthenticationService.logout();
      this.passwordModel.setData(this.initialState());
      this.navTo("Login");
    }
    validate(current, next, confirm) {
      const states = {
        currentState: current ? "None" : "Error",
        nextState: next.length >= MIN_PASSWORD_LENGTH ? "None" : "Error",
        confirmState: next === confirm ? "None" : "Error"
      };
      Object.entries(states).forEach(([key, state]) => this.passwordModel.setProperty(`/${key}`, state));
      return Object.values(states).every(state => state === "None");
    }
    initialState() {
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
  return ChangePassword;
});
//# sourceMappingURL=ChangePassword-dbg.controller.js.map
