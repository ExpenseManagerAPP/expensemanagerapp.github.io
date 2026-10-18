import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import type Dialog from "sap/m/Dialog";
import type List from "sap/m/List";
import type Control from "sap/ui/core/Control";
import type Event from "sap/ui/base/Event";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import type ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import type ODataModel from "sap/ui/model/odata/v4/ODataModel";
import { BaseController } from "./BaseController";
import type Component from "../Component";
import { AuthenticationService } from "../auth/AuthenticationService";
import { getBackendErrorMessage } from "../util/feedback";
import { chooseAction } from "../util/choiceDialog";
import { ButtonType } from "sap/m/library";

const MIN_PASSWORD_LENGTH = 8;
const GENERATED_PASSWORD_LENGTH = 12;
const PASSWORD_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailServerForm {
    Host: string;
    Port: number | string;
    Username: string;
    Sender: string;
    Password: string;
    Saved: boolean;
    PasswordReadable: boolean;
    Source: "SETTINGS" | "ENVIRONMENT" | "NONE";
    testRecipient: string;
}

interface AdminUser {
    ID: string;
    Email: string;
    Name?: string;
    Role: string;
    Status: string;
}

/**
 * Administration page (admins only): lists the app users and lets the admin
 * approve sign-ups, enable/disable accounts, change roles, set a temporary
 * password and create users. Talks to the AdminService (/service/Admin/).
 */
export default class Admin extends BaseController {

    private viewModel: JSONModel;

    public onInit(): void {
        this.viewModel = new JSONModel(this.initialState());
        this.getView()?.setModel(this.viewModel, "adminView");
        this.getRouter().getRoute("Admin")?.attachPatternMatched(() => this.showUsers());
    }

    public onAdminTabSelect(): void {
        if (this.viewModel.getProperty("/tab") === "email") {
            void this.loadEmailServer();
        }
    }

    public async onSaveEmailServer(): Promise<void> {
        const email = this.viewModel.getProperty("/email") as EmailServerForm;
        const saved = await this.callAdmin("SaveEmailServer", {
            Host: email.Host.trim(),
            Port: Number(email.Port),
            Username: email.Username.trim(),
            Sender: email.Sender.trim(),
            Password: email.Password
        }, this.getText("adminEmailSaved"));

        if (saved) {
            await this.loadEmailServer();
        }
    }

    public async onRemoveEmailServer(): Promise<void> {
        if (!(await this.confirm(this.getText("adminEmailRemove"), this.getText("adminEmailRemoveConfirm")))) {
            return;
        }

        if (await this.callAdmin("RemoveEmailServer", {}, this.getText("adminEmailRemoved"))) {
            await this.loadEmailServer();
        }
    }

    public async onSendTestEmail(): Promise<void> {
        const recipient = (this.viewModel.getProperty("/email/testRecipient") as string).trim();
        await this.callAdmin("SendTestEmail", { Recipient: recipient }, this.getText("adminEmailTestSent", [recipient]));
    }

    public onBack(): void {
        this.navTo("Home");
    }

    public onFilterChange(): void {
        this.applyFilters();
    }

    public onSearch(): void {
        this.applyFilters();
    }

    public async onApprove(event: Event): Promise<void> {
        const user = this.userOf(event);
        await this.runAction("ApproveUser", { UserId: user.ID }, this.getText("adminApproved", [user.Email]));
    }

    /**
     * Enables a disabled account, or disables an active one after a confirmation.
     */
    public async onToggleStatus(event: Event): Promise<void> {
        const user = this.userOf(event);
        const disabling = user.Status !== "Disabled";

        if (disabling && !(await this.confirm(this.getText("adminDisable"), this.getText("adminDisableConfirm", [user.Email])))) {
            return;
        }

        await this.runAction(
            "SetUserStatus",
            { UserId: user.ID, Status: disabling ? "Disabled" : "Active" },
            this.getText(disabling ? "adminDisabled" : "adminEnabled", [user.Email])
        );
    }

    public async onToggleRole(event: Event): Promise<void> {
        const user = this.userOf(event);
        const role = user.Role === "Admin" ? "User" : "Admin";
        const question = this.getText(role === "Admin" ? "adminPromoteConfirm" : "adminDemoteConfirm", [user.Email]);

        if (await this.confirm(this.getText(role === "Admin" ? "adminPromote" : "adminDemote"), question)) {
            await this.runAction("SetUserRole", { UserId: user.ID, Role: role }, this.getText("adminRoleChanged", [user.Email]));
        }
    }

    public onOpenResetPassword(event: Event): void {
        const user = this.userOf(event);
        this.viewModel.setProperty("/reset", { userId: user.ID, email: user.Email, password: this.generatePassword(), passwordState: "None" });
        (this.byId("resetPasswordDialog") as Dialog).open();
    }

    public async onConfirmResetPassword(): Promise<void> {
        const { userId, email, password } = this.viewModel.getProperty("/reset") as { userId: string; email: string; password: string };

        if (password.length < MIN_PASSWORD_LENGTH) {
            this.viewModel.setProperty("/reset/passwordState", "Error");
            return;
        }

        (this.byId("resetPasswordDialog") as Dialog).close();
        await this.runAction("ResetUserPassword", { UserId: userId, Password: password }, this.getText("adminPasswordReset", [email]));
    }

    public onOpenCreateUser(): void {
        this.viewModel.setProperty("/create", {
            name: "",
            email: "",
            password: this.generatePassword(),
            role: "User",
            nameState: "None",
            emailState: "None",
            passwordState: "None"
        });
        (this.byId("createUserDialog") as Dialog).open();
    }

    public async onConfirmCreateUser(): Promise<void> {
        const form = this.viewModel.getProperty("/create") as { name: string; email: string; password: string; role: string };
        const checks = {
            nameState: !!form.name.trim(),
            emailState: EMAIL_PATTERN.test(form.email.trim()),
            passwordState: form.password.length >= MIN_PASSWORD_LENGTH
        };

        Object.entries(checks).forEach(([key, valid]) => this.viewModel.setProperty(`/create/${key}`, valid ? "None" : "Error"));

        if (!Object.values(checks).every(Boolean)) {
            return;
        }

        (this.byId("createUserDialog") as Dialog).close();
        await this.runAction(
            "CreateUser",
            { Email: form.email.trim(), Name: form.name.trim(), Password: form.password, Role: form.role },
            this.getText("adminUserCreated", [form.email.trim()])
        );
    }

    public onGeneratePassword(event: Event): void {
        const target = (event.getSource<Control>().data("target") as string) || "/create/password";
        this.viewModel.setProperty(target, this.generatePassword());
    }

    public onCloseDialog(event: Event): void {
        (event.getSource<Control>().getParent() as Dialog).close();
    }

    private showUsers(): void {
        const model = (this.getOwnerComponent() as unknown as Component).getAdminModel();

        if (!model) {
            this.navTo("Home");
            return;
        }

        this.viewModel.setProperty("/selfEmail", AuthenticationService.getSession()?.userName ?? "");
        this.getView()?.setModel(model, "admin");
        this.usersBinding()?.refresh();

        if (this.viewModel.getProperty("/tab") === "email") {
            void this.loadEmailServer();
        }
    }

    /**
     * Reads the e-mail server settings (never the password) into the form.
     */
    private async loadEmailServer(): Promise<void> {
        const model = this.getView()?.getModel("admin") as ODataModel | undefined;

        if (!model) {
            return;
        }

        try {
            const binding = model.bindContext("/EmailServer()");
            const info = await binding.requestObject() as Omit<EmailServerForm, "Password" | "testRecipient">;
            const testRecipient = (this.viewModel.getProperty("/email/testRecipient") as string) || (AuthenticationService.getSession()?.userName ?? "");
            this.viewModel.setProperty("/email", { ...info, Password: "", testRecipient });
        } catch (error) {
            MessageBox.error(getBackendErrorMessage(error) || this.getText("adminActionFailed"));
        }
    }

    private applyFilters(): void {
        const status = this.viewModel.getProperty("/status") as string;
        const query = (this.viewModel.getProperty("/query") as string).trim();
        const filters: Filter[] = [];

        if (status !== "All") {
            filters.push(new Filter("Status", FilterOperator.EQ, status));
        }

        if (query) {
            filters.push(new Filter({
                filters: [
                    new Filter({ path: "Email", operator: FilterOperator.Contains, value1: query, caseSensitive: false }),
                    new Filter({ path: "Name", operator: FilterOperator.Contains, value1: query, caseSensitive: false })
                ],
                and: false
            }));
        }

        this.usersBinding()?.filter(filters.length ? new Filter({ filters, and: true }) : []);
    }

    /**
     * Calls a user action of the AdminService, then reloads the list.
     */
    private async runAction(name: string, parameters: Record<string, string>, successText: string): Promise<void> {
        if (await this.callAdmin(name, parameters, successText)) {
            this.usersBinding()?.refresh();
        }
    }

    /**
     * Invokes an AdminService action. Errors (e.g. "you cannot change your own
     * role", or the SMTP server's refusal) are shown as the backend message.
     *
     * @returns {Promise<boolean>} true when the action succeeded
     */
    private async callAdmin(name: string, parameters: Record<string, string | number>, successText: string): Promise<boolean> {
        const model = this.getView()?.getModel("admin") as ODataModel | undefined;

        if (!model) {
            return false;
        }

        this.viewModel.setProperty("/busy", true);

        try {
            const action = model.bindContext(`/${name}(...)`);
            Object.entries(parameters).forEach(([key, value]) => action.setParameter(key, value));
            await action.invoke();
            MessageToast.show(successText);
            return true;
        } catch (error) {
            MessageBox.error(getBackendErrorMessage(error) || this.getText("adminActionFailed"));
            return false;
        } finally {
            this.viewModel.setProperty("/busy", false);
        }
    }

    private async confirm(action: string, message: string): Promise<boolean> {
        const choice = await chooseAction({
            title: this.getText("adminTitle"),
            message,
            choices: [{ key: "confirm", text: action, type: ButtonType.Emphasized }],
            cancelText: this.getText("sharesCancelButton")
        });

        return choice === "confirm";
    }

    private usersBinding(): ODataListBinding | undefined {
        return (this.byId("usersList") as List | undefined)?.getBinding("items") as ODataListBinding | undefined;
    }

    private userOf(event: Event): AdminUser {
        return event.getSource<Control>().getBindingContext("admin")?.getObject() as AdminUser;
    }

    private generatePassword(): string {
        const values = new Uint32Array(GENERATED_PASSWORD_LENGTH);
        crypto.getRandomValues(values);

        return Array.from(values, (value) => PASSWORD_CHARACTERS[value % PASSWORD_CHARACTERS.length]).join("");
    }

    private initialState(): object {
        return {
            tab: "users",
            email: { Host: "", Port: 587, Username: "", Sender: "", Password: "", Saved: false, PasswordReadable: false, Source: "NONE", testRecipient: "" },
            status: "All",
            query: "",
            selfEmail: "",
            busy: false,
            reset: { userId: "", email: "", password: "", passwordState: "None" },
            create: { name: "", email: "", password: "", role: "User", nameState: "None", emailState: "None", passwordState: "None" }
        };
    }

}
