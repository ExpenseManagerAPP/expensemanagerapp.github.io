import BaseComponent from "sap/ui/core/UIComponent";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import MessageBox from "sap/m/MessageBox";
import type AppRouter from "./routing/AppRouter";
import { EMAIL_LINK_ROUTES, GUEST_ROUTES } from "./routing/routes";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import ResourceBundle from "sap/base/i18n/ResourceBundle";
import { createDeviceModel } from "./model/models";
import UiModel from "./model/UiModel";
import { AuthenticationService } from "./auth/AuthenticationService";
import { AuthenticatedProviderFactory } from "./auth/providers/AuthenticatedProviderFactory";
import { AuthApi } from "./auth/AuthApi";
import { SessionStorage } from "./auth/storage/SessionStorage";
import Environment, { EnvironmentType } from "./util/Environment";
import { isSessionExpiredError, isBackendUnavailableError } from "./util/http";
import { getBackendErrorMessage } from "./util/feedback";
import { ensureThemeApplied } from "./util/theme";
import { PERSON_CHANNEL, PERSON_DRAFT_CLOSING } from "./util/personEvents";
import type Home from "./controller/Home.controller";

const TOKEN_RETRY_MS = 5000;

/**
 * @namespace apps.dflc.expensemanager
 */
export default class Component extends BaseComponent {

    public static metadata = {
        manifest: "json",
        interfaces: [
            "sap.ui.core.IAsyncContentCreation"
        ]
    };

    private _sessionExpiredShown = false;
    private _serviceModelPromise: Promise<ODataModel | null> | null = null;
    private _modelToken = "";
    private _unexpectedErrorShown = false;
    private _workspace?: Home;

    /**
     * The Home controller is the workspace of the tab views: it owns the
     * selected person, its draft lifecycle and the shared dialogs.
     *
     * @param {Home} workspace the Home controller
     */
    public setWorkspace(workspace: Home): void {
        this._workspace = workspace;
    }

    public getWorkspace(): Home | undefined {
        return this._workspace;
    }

    public async init(): Promise<void> {
        super.init();

        ensureThemeApplied();

        try {
            await AuthApi.loadRuntimeConfig();
        } catch (error) {
            console.error("[init] runtime-config.json", error);
        }

        this.registerGlobalErrorHandlers();

        AuthenticationService.initialize(
            AuthenticatedProviderFactory.create()
        );

        AuthenticationService.onSessionExpired(() => this.handleSessionExpired());
        AuthenticationService.onSessionRefreshed((session) => this.applyAccessToken(session.accessToken));
        AuthenticationService.onSignedOut(() => this.resetServiceModel());
        AuthenticationService.onAuthError((message) => this.handleAuthError(message));

        this.setModel(createDeviceModel(), "device");
        this.setModel(new UiModel(), "ui");

        const environment = Environment.current();

        if (environment === EnvironmentType.GITHUB) {
            // The service model is provisioned lazily by the route guard and the controllers.
        } else if (environment === EnvironmentType.LOCAL && AuthApi.getConfig().auth) {
            AuthApi.setLocalOverrides();
        } else {
            this.prepareStandaloneServiceModel();
        }

        const router = this.getRouter() as AppRouter;
        router.setGuard((routeName) => this.guardRoute(routeName));
        router.initialize();
    }

    /**
     * Last-resort safety net: surfaces unexpected async failures and window
     * errors that escaped every local handler, so the user always sees a
     * message instead of a silent broken screen.
     */
    private registerGlobalErrorHandlers(): void {
        window.addEventListener("unhandledrejection", (event) => {
            event.preventDefault();
            this.handleUnexpectedError((event as PromiseRejectionEvent).reason);
        });
        window.addEventListener("error", (event) => {
            this.handleUnexpectedError((event as ErrorEvent).error);
        });
    }

    /**
     * Reports an unexpected error once per dialog cycle (deduplicated while the
     * MessageBox is open). Session/auth/backend-unavailability errors are
     * ignored because they already have dedicated handlers.
     *
     * @param {unknown} reason the uncaught error or rejection reason
     */
    public handleUnexpectedError(reason: unknown): void {
        if (!reason || isSessionExpiredError(reason) || isBackendUnavailableError(reason)) {
            return;
        }

        console.error("[unexpected]", reason);

        if (this._unexpectedErrorShown) {
            return;
        }
        this._unexpectedErrorShown = true;

        const bundle = (this.getModel("i18n") as ResourceModel)?.getResourceBundle() as ResourceBundle | undefined;
        const base = bundle?.getText("unexpectedError") ?? "Ocorreu um erro inesperado.";
        const detail = getBackendErrorMessage(reason);
        MessageBox.error(detail ? `${base}\n\n${detail}` : base, {
            onClose: () => {
                this._unexpectedErrorShown = false;
            }
        });
    }

    /**
     * Resolves with the shared OData model once a valid session is available,
     * or with `null` when the user is not authenticated. The provisioning can
     * be retried after a login (the promise is re-armed when it fails).
     *
     * @returns {Promise<ODataModel | null>} the shared service model, or null when not authenticated
     */
    public ensureServiceModel(): Promise<ODataModel | null> {
        if (AuthenticationService.mustChangePassword()) {
            return Promise.resolve(null);
        }

        const current = this.getModel() as ODataModel | undefined;

        if (current && this.isModelTokenCurrent()) {
            return Promise.resolve(current);
        }

        if (!this._serviceModelPromise) {
            this._serviceModelPromise = this.provisionServiceModel().then((model) => {
                if (!model) {
                    this._serviceModelPromise = null;
                }
                return model;
            }).catch((error) => {
                this._serviceModelPromise = null;
                throw error;
            });
        }

        return this._serviceModelPromise;
    }

    private isModelTokenCurrent(): boolean {
        const session = AuthenticationService.getSession();
        const token = session?.accessToken ?? "";

        if (token && (!session || session.expiresAt <= Date.now())) {
            return false;
        }

        return this._modelToken === token;
    }

    private async provisionServiceModel(): Promise<ODataModel | null> {
        const session = AuthenticationService.getSession();

        if (session?.accessToken && session.expiresAt > Date.now()) {
            this.setServiceModel(session.accessToken);
            return this.getModel() as ODataModel;
        }

        const authenticated = await AuthenticationService.isAuthenticated();
        const updated = AuthenticationService.getSession();

        if (authenticated && updated?.accessToken && updated.expiresAt > Date.now()) {
            this.setServiceModel(updated.accessToken);
            return this.getModel() as ODataModel;
        }

        return null;
    }

    /**
     * Picks the route to show instead of the requested one: the login page
     * without a session, the password change while it is pending, and the
     * workspace when a signed-in user opens a guest page. E-mail links
     * (confirmation, password reset) open in any case.
     *
     * @param {string} routeName the requested route
     * @returns {string | null} the route to show instead, or null to allow it
     */
    private guardRoute(routeName: string): string | null {
        if (!this.isAuthRequired()) {
            return null;
        }

        const authenticated = AuthenticationService.hasValidSession();
        const mustChangePassword = authenticated && AuthenticationService.mustChangePassword();

        if (EMAIL_LINK_ROUTES.includes(routeName)) {
            return null;
        }

        if (!authenticated) {
            return GUEST_ROUTES.includes(routeName) || AuthenticationService.isAuthErrorPending() ? null : "Login";
        }

        if (mustChangePassword) {
            return routeName === "ChangePassword" ? null : "ChangePassword";
        }

        return GUEST_ROUTES.includes(routeName) || routeName === "ChangePassword" ? "Home" : null;
    }

    /**
     * Drops the service model and the UI state on sign-out, so the next user
     * never sees data cached for the previous one.
     */
    private resetServiceModel(): void {
        const model = this.getModel() as ODataModel | undefined;

        this.getEventBus().publish(PERSON_CHANNEL, PERSON_DRAFT_CLOSING);
        this._serviceModelPromise = null;
        this._modelToken = "";
        this.setModel(null as unknown as ODataModel);
        model?.destroy();
        (this.getModel("ui") as UiModel).reset();
    }

    private isAuthRequired(): boolean {
        const environment = Environment.current();

        if (environment === EnvironmentType.GITHUB) {
            return true;
        }

        if (environment === EnvironmentType.LOCAL && AuthApi.getConfig().auth) {
            return true;
        }

        return false;
    }

    private setServiceModel(accessToken: string): void {
        const config = AuthApi.getConfig();
        const httpHeaders: Record<string, string> = {};
        const previous = this.getModel() as ODataModel | undefined;

        if (accessToken) {
            httpHeaders.Authorization = `Bearer ${accessToken}`;
        }

        const model = new ODataModel({
            serviceUrl: config.odataService,
            httpHeaders,
            operationMode: "Server",
            autoExpandSelect: true,
            earlyRequests: true
        });

        model.attachSessionTimeout(() => AuthenticationService.notifySessionExpired());

        this._modelToken = accessToken;
        this.setModel(model);
        previous?.destroy();
    }

    /**
     * Sends the renewed access token with the next requests of the service
     * model. The header cannot change while the model has pending changes, so
     * it is retried shortly until those are submitted.
     *
     * @param {string} accessToken the renewed access token
     */
    private applyAccessToken(accessToken: string): void {
        const model = this.getModel() as ODataModel | undefined;

        if (!model || !this._modelToken) {
            return;
        }

        try {
            model.changeHttpHeaders({ Authorization: `Bearer ${accessToken}` });
            this._modelToken = accessToken;
        } catch {
            setTimeout(() => {
                if (AuthenticationService.getSession()?.accessToken === accessToken) {
                    this.applyAccessToken(accessToken);
                }
            }, TOKEN_RETRY_MS);
        }
    }

    private prepareStandaloneServiceModel(): void {
        if (!AuthApi.getConfig().odataService) {
            this.applyManifestServiceUrl();
        }
        this.setServiceModel("");
    }

    private applyManifestServiceUrl(): void {
        const manifest = this.getManifestObject() as { get?: (key: string) => unknown } | undefined;
        const uri = manifest?.get?.("/sap.app/dataSources/mainService/uri") as string | undefined;

        if (uri) {
            AuthApi.setServiceUrl(uri);
        }
    }

    private handleSessionExpired(): void {
        if (this._sessionExpiredShown) {
            return;
        }

        this._sessionExpiredShown = true;
        SessionStorage.clear();
        this._serviceModelPromise = null;

        const bundle = (this.getModel("i18n") as ResourceModel)?.getResourceBundle() as ResourceBundle | undefined;
        const title = bundle?.getText("sessionExpiredTitle") ?? "Sessão expirada";
        const message = bundle?.getText("sessionExpiredMessage") ?? "Sua sessão expirou. Faça login novamente para continuar.";

        MessageBox.show(message, {
            title,
            icon: MessageBox.Icon.WARNING,
            onClose: () => {
                this._sessionExpiredShown = false;
                this.getRouter().navTo("Login");
            }
        });
    }

    private handleAuthError(message: string): void {
        const bundle = (this.getModel("i18n") as ResourceModel)?.getResourceBundle() as ResourceBundle | undefined;
        const prefix = bundle?.getText("authErrorPrefix") ?? "Erro ao autenticar, motivo";

        const reason = /failed to fetch|networkerror|load failed/i.test(message)
            ? bundle?.getText("authUnreachable") ?? message
            : message;

        this._sessionExpiredShown = true;
        MessageBox.error(`${prefix}: ${reason}`, {
            onClose: () => {
                this._sessionExpiredShown = false;
                AuthenticationService.clearAuthError();
                this.getRouter().navTo("Login");
            }
        });
    }
}
