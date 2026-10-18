sap.ui.define(["sap/ui/model/json/JSONModel", "sap/m/MessageBox", "sap/m/MessageToast", "sap/ui/model/Filter", "sap/ui/model/FilterOperator", "./BaseController", "../auth/AuthenticationService", "../util/feedback", "../util/choiceDialog", "sap/m/library"], function (JSONModel, MessageBox, MessageToast, Filter, FilterOperator, ___BaseController, ___auth_AuthenticationService, ___util_feedback, ___util_choiceDialog, sap_m_library) {
  "use strict";

  const BaseController = ___BaseController["BaseController"];
  const AuthenticationService = ___auth_AuthenticationService["AuthenticationService"];
  const getBackendErrorMessage = ___util_feedback["getBackendErrorMessage"];
  const chooseAction = ___util_choiceDialog["chooseAction"];
  const ButtonType = sap_m_library["ButtonType"];
  const MIN_PASSWORD_LENGTH = 8;
  const GENERATED_PASSWORD_LENGTH = 12;
  const PASSWORD_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  /**
   * Administration page (admins only): lists the app users and lets the admin
   * approve sign-ups, enable/disable accounts, change roles, set a temporary
   * password and create users. Talks to the AdminService (/service/Admin/).
   */
  class Admin extends BaseController {
    onInit() {
      this.viewModel = new JSONModel(this.initialState());
      this.getView()?.setModel(this.viewModel, "adminView");
      this.getRouter().getRoute("Admin")?.attachPatternMatched(() => this.showUsers());
    }
    onBack() {
      this.navTo("Home");
    }
    onFilterChange() {
      this.applyFilters();
    }
    onSearch() {
      this.applyFilters();
    }
    async onApprove(event) {
      const user = this.userOf(event);
      await this.runAction("ApproveUser", {
        UserId: user.ID
      }, this.getText("adminApproved", [user.Email]));
    }

    /**
     * Enables a disabled account, or disables an active one after a confirmation.
     */
    async onToggleStatus(event) {
      const user = this.userOf(event);
      const disabling = user.Status !== "Disabled";
      if (disabling && !(await this.confirm(this.getText("adminDisable"), this.getText("adminDisableConfirm", [user.Email])))) {
        return;
      }
      await this.runAction("SetUserStatus", {
        UserId: user.ID,
        Status: disabling ? "Disabled" : "Active"
      }, this.getText(disabling ? "adminDisabled" : "adminEnabled", [user.Email]));
    }
    async onToggleRole(event) {
      const user = this.userOf(event);
      const role = user.Role === "Admin" ? "User" : "Admin";
      const question = this.getText(role === "Admin" ? "adminPromoteConfirm" : "adminDemoteConfirm", [user.Email]);
      if (await this.confirm(this.getText(role === "Admin" ? "adminPromote" : "adminDemote"), question)) {
        await this.runAction("SetUserRole", {
          UserId: user.ID,
          Role: role
        }, this.getText("adminRoleChanged", [user.Email]));
      }
    }
    onOpenResetPassword(event) {
      const user = this.userOf(event);
      this.viewModel.setProperty("/reset", {
        userId: user.ID,
        email: user.Email,
        password: this.generatePassword(),
        passwordState: "None"
      });
      this.byId("resetPasswordDialog").open();
    }
    async onConfirmResetPassword() {
      const {
        userId,
        email,
        password
      } = this.viewModel.getProperty("/reset");
      if (password.length < MIN_PASSWORD_LENGTH) {
        this.viewModel.setProperty("/reset/passwordState", "Error");
        return;
      }
      this.byId("resetPasswordDialog").close();
      await this.runAction("ResetUserPassword", {
        UserId: userId,
        Password: password
      }, this.getText("adminPasswordReset", [email]));
    }
    onOpenCreateUser() {
      this.viewModel.setProperty("/create", {
        name: "",
        email: "",
        password: this.generatePassword(),
        role: "User",
        nameState: "None",
        emailState: "None",
        passwordState: "None"
      });
      this.byId("createUserDialog").open();
    }
    async onConfirmCreateUser() {
      const form = this.viewModel.getProperty("/create");
      const checks = {
        nameState: !!form.name.trim(),
        emailState: EMAIL_PATTERN.test(form.email.trim()),
        passwordState: form.password.length >= MIN_PASSWORD_LENGTH
      };
      Object.entries(checks).forEach(([key, valid]) => this.viewModel.setProperty(`/create/${key}`, valid ? "None" : "Error"));
      if (!Object.values(checks).every(Boolean)) {
        return;
      }
      this.byId("createUserDialog").close();
      await this.runAction("CreateUser", {
        Email: form.email.trim(),
        Name: form.name.trim(),
        Password: form.password,
        Role: form.role
      }, this.getText("adminUserCreated", [form.email.trim()]));
    }
    onGeneratePassword(event) {
      const target = event.getSource().data("target") || "/create/password";
      this.viewModel.setProperty(target, this.generatePassword());
    }
    onCloseDialog(event) {
      event.getSource().getParent().close();
    }
    showUsers() {
      const model = this.getOwnerComponent().getAdminModel();
      if (!model) {
        this.navTo("Home");
        return;
      }
      this.viewModel.setProperty("/selfEmail", AuthenticationService.getSession()?.userName ?? "");
      this.getView()?.setModel(model, "admin");
      this.usersBinding()?.refresh();
    }
    applyFilters() {
      const status = this.viewModel.getProperty("/status");
      const query = this.viewModel.getProperty("/query").trim();
      const filters = [];
      if (status !== "All") {
        filters.push(new Filter("Status", FilterOperator.EQ, status));
      }
      if (query) {
        filters.push(new Filter({
          filters: [new Filter({
            path: "Email",
            operator: FilterOperator.Contains,
            value1: query,
            caseSensitive: false
          }), new Filter({
            path: "Name",
            operator: FilterOperator.Contains,
            value1: query,
            caseSensitive: false
          })],
          and: false
        }));
      }
      this.usersBinding()?.filter(filters.length ? new Filter({
        filters,
        and: true
      }) : []);
    }

    /**
     * Calls an AdminService action, then reloads the list. Errors (e.g. "you
     * cannot change your own role") are shown as the backend message.
     */
    async runAction(name, parameters, successText) {
      const model = this.getView()?.getModel("admin");
      if (!model) {
        return;
      }
      this.viewModel.setProperty("/busy", true);
      try {
        const action = model.bindContext(`/${name}(...)`);
        Object.entries(parameters).forEach(([key, value]) => action.setParameter(key, value));
        await action.invoke();
        MessageToast.show(successText);
        this.usersBinding()?.refresh();
      } catch (error) {
        MessageBox.error(getBackendErrorMessage(error) || this.getText("adminActionFailed"));
      } finally {
        this.viewModel.setProperty("/busy", false);
      }
    }
    async confirm(action, message) {
      const choice = await chooseAction({
        title: this.getText("adminTitle"),
        message,
        choices: [{
          key: "confirm",
          text: action,
          type: ButtonType.Emphasized
        }],
        cancelText: this.getText("sharesCancelButton")
      });
      return choice === "confirm";
    }
    usersBinding() {
      return this.byId("usersList")?.getBinding("items");
    }
    userOf(event) {
      return event.getSource().getBindingContext("admin")?.getObject();
    }
    generatePassword() {
      const values = new Uint32Array(GENERATED_PASSWORD_LENGTH);
      crypto.getRandomValues(values);
      return Array.from(values, value => PASSWORD_CHARACTERS[value % PASSWORD_CHARACTERS.length]).join("");
    }
    initialState() {
      return {
        status: "All",
        query: "",
        selfEmail: "",
        busy: false,
        reset: {
          userId: "",
          email: "",
          password: "",
          passwordState: "None"
        },
        create: {
          name: "",
          email: "",
          password: "",
          role: "User",
          nameState: "None",
          emailState: "None",
          passwordState: "None"
        }
      };
    }
  }
  return Admin;
});
//# sourceMappingURL=Admin-dbg.controller.js.map
