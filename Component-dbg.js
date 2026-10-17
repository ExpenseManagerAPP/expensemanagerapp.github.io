sap.ui.define(["sap/ui/core/UIComponent", "sap/ui/model/odata/v4/ODataModel", "sap/m/MessageBox", "./model/models", "./model/UiModel", "./auth/AuthenticationService", "./auth/providers/AuthenticatedProviderFactory", "./auth/AuthApi", "./auth/storage/SessionStorage", "./util/Environment", "./util/http", "./util/feedback", "./util/theme", "./util/personEvents"], function (BaseComponent, ODataModel, MessageBox, ___model_models, __UiModel, ___auth_AuthenticationService, ___auth_providers_AuthenticatedProviderFactory, ___auth_AuthApi, ___auth_storage_SessionStorage, __Environment, ___util_http, ___util_feedback, ___util_theme, ___util_personEvents) {
  "use strict";

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule && typeof obj.default !== "undefined" ? obj.default : obj;
  }
  const createDeviceModel = ___model_models["createDeviceModel"];
  const UiModel = _interopRequireDefault(__UiModel);
  const AuthenticationService = ___auth_AuthenticationService["AuthenticationService"];
  const AuthenticatedProviderFactory = ___auth_providers_AuthenticatedProviderFactory["AuthenticatedProviderFactory"];
  const AuthApi = ___auth_AuthApi["AuthApi"];
  const SessionStorage = ___auth_storage_SessionStorage["SessionStorage"];
  const Environment = _interopRequireDefault(__Environment);
  const EnvironmentType = __Environment["EnvironmentType"];
  const isSessionExpiredError = ___util_http["isSessionExpiredError"];
  const isBackendUnavailableError = ___util_http["isBackendUnavailableError"];
  const getBackendErrorMessage = ___util_feedback["getBackendErrorMessage"];
  const ensureThemeApplied = ___util_theme["ensureThemeApplied"];
  const PERSON_CHANNEL = ___util_personEvents["PERSON_CHANNEL"];
  const PERSON_DRAFT_CLOSING = ___util_personEvents["PERSON_DRAFT_CLOSING"];
  const TOKEN_RETRY_MS = 5000;

  /**
   * @namespace apps.dflc.expensemanager
   */
  const Component = BaseComponent.extend("apps.dflc.expensemanager.Component", {
    constructor: function constructor() {
      BaseComponent.prototype.constructor.apply(this, arguments);
      this._sessionExpiredShown = false;
      this._serviceModelPromise = null;
      this._modelToken = "";
      this._unexpectedErrorShown = false;
    },
    metadata: {
      manifest: "json",
      interfaces: ["sap.ui.core.IAsyncContentCreation"]
    },
    /**
     * The Home controller is the workspace of the tab views: it owns the
     * selected person, its draft lifecycle and the shared dialogs.
     *
     * @param {Home} workspace the Home controller
     */
    setWorkspace: function _setWorkspace(workspace) {
      this._workspace = workspace;
    },
    getWorkspace: function _getWorkspace() {
      return this._workspace;
    },
    init: async function _init() {
      BaseComponent.prototype.init.call(this);
      ensureThemeApplied();
      try {
        await AuthApi.loadRuntimeConfig();
      } catch (error) {
        console.error("[init] runtime-config.json", error);
      }
      this.registerGlobalErrorHandlers();
      AuthenticationService.initialize(AuthenticatedProviderFactory.create());
      AuthenticationService.onSessionExpired(() => this.handleSessionExpired());
      AuthenticationService.onSessionRefreshed(session => this.applyAccessToken(session.accessToken));
      AuthenticationService.onSignedOut(() => this.resetServiceModel());
      AuthenticationService.onAuthError(message => this.handleAuthError(message));
      this.setModel(createDeviceModel(), "device");
      this.setModel(new UiModel(), "ui");
      const environment = Environment.current();
      if (environment === EnvironmentType.GITHUB) {
        // The service model is provisioned lazily by the route guard and the controllers.
      } else if (environment === EnvironmentType.LOCAL && AuthApi.getConfig().auth) {
        AuthApi.setLocalOverrides();
      } else if (environment === EnvironmentType.BTP) {
        this.prepareBtpServiceModel();
      } else {
        this.prepareStandaloneServiceModel();
      }
      const router = this.getRouter();
      router.setGuard(routeName => this.guardRoute(routeName));
      router.initialize();
    },
    /**
     * Last-resort safety net: surfaces unexpected async failures and window
     * errors that escaped every local handler, so the user always sees a
     * message instead of a silent broken screen.
     */
    registerGlobalErrorHandlers: function _registerGlobalErrorHandlers() {
      window.addEventListener("unhandledrejection", event => {
        event.preventDefault();
        this.handleUnexpectedError(event.reason);
      });
      window.addEventListener("error", event => {
        this.handleUnexpectedError(event.error);
      });
    },
    /**
     * Reports an unexpected error once per dialog cycle (deduplicated while the
     * MessageBox is open). Session/auth/backend-unavailability errors are
     * ignored because they already have dedicated handlers.
     *
     * @param {unknown} reason the uncaught error or rejection reason
     */
    handleUnexpectedError: function _handleUnexpectedError(reason) {
      if (!reason || isSessionExpiredError(reason) || isBackendUnavailableError(reason)) {
        return;
      }
      console.error("[unexpected]", reason);
      if (this._unexpectedErrorShown) {
        return;
      }
      this._unexpectedErrorShown = true;
      const bundle = this.getModel("i18n")?.getResourceBundle();
      const base = bundle?.getText("unexpectedError") ?? "Ocorreu um erro inesperado.";
      const detail = getBackendErrorMessage(reason);
      MessageBox.error(detail ? `${base}\n\n${detail}` : base, {
        onClose: () => {
          this._unexpectedErrorShown = false;
        }
      });
    },
    /**
     * Resolves with the shared OData model once a valid session is available,
     * or with `null` when the user is not authenticated. The provisioning can
     * be retried after a login (the promise is re-armed when it fails).
     *
     * @returns {Promise<ODataModel | null>} the shared service model, or null when not authenticated
     */
    ensureServiceModel: function _ensureServiceModel() {
      if (AuthenticationService.mustChangePassword()) {
        return Promise.resolve(null);
      }
      const current = this.getModel();
      if (current && this.isModelTokenCurrent()) {
        return Promise.resolve(current);
      }
      if (!this._serviceModelPromise) {
        this._serviceModelPromise = this.provisionServiceModel().then(model => {
          if (!model) {
            this._serviceModelPromise = null;
          }
          return model;
        }).catch(error => {
          this._serviceModelPromise = null;
          throw error;
        });
      }
      return this._serviceModelPromise;
    },
    isModelTokenCurrent: function _isModelTokenCurrent() {
      const session = AuthenticationService.getSession();
      const token = session?.accessToken ?? "";
      if (token && (!session || session.expiresAt <= Date.now())) {
        return false;
      }
      return this._modelToken === token;
    },
    provisionServiceModel: async function _provisionServiceModel() {
      const session = AuthenticationService.getSession();
      if (session?.accessToken && session.expiresAt > Date.now()) {
        this.setServiceModel(session.accessToken);
        return this.getModel();
      }
      const authenticated = await AuthenticationService.isAuthenticated();
      const updated = AuthenticationService.getSession();
      if (authenticated && updated?.accessToken && updated.expiresAt > Date.now()) {
        this.setServiceModel(updated.accessToken);
        return this.getModel();
      }
      return null;
    },
    /**
     * Picks the route to show instead of the requested one: the login page
     * without a session, the password change while it is pending, and the
     * workspace when a signed-in user opens the login page.
     *
     * @param {string} routeName the requested route
     * @returns {string | null} the route to show instead, or null to allow it
     */
    guardRoute: function _guardRoute(routeName) {
      if (!this.isAuthRequired()) {
        return null;
      }
      const authenticated = AuthenticationService.hasValidSession();
      const mustChangePassword = authenticated && AuthenticationService.mustChangePassword();
      if (!authenticated) {
        return routeName === "Login" || AuthenticationService.isAuthErrorPending() ? null : "Login";
      }
      if (mustChangePassword) {
        return routeName === "ChangePassword" ? null : "ChangePassword";
      }
      return routeName === "Login" || routeName === "ChangePassword" ? "Home" : null;
    },
    /**
     * Drops the service model and the UI state on sign-out, so the next user
     * never sees data cached for the previous one.
     */
    resetServiceModel: function _resetServiceModel() {
      const model = this.getModel();
      this.getEventBus().publish(PERSON_CHANNEL, PERSON_DRAFT_CLOSING);
      this._serviceModelPromise = null;
      this._modelToken = "";
      this.setModel(null);
      model?.destroy();
      this.getModel("ui").reset();
    },
    isAuthRequired: function _isAuthRequired() {
      const environment = Environment.current();
      if (environment === EnvironmentType.GITHUB) {
        return true;
      }
      if (environment === EnvironmentType.LOCAL && AuthApi.getConfig().auth) {
        return true;
      }
      return false;
    },
    setServiceModel: function _setServiceModel(accessToken) {
      const config = AuthApi.getConfig();
      const httpHeaders = {};
      const previous = this.getModel();
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
    },
    /**
     * Sends the renewed access token with the next requests of the service
     * model. The header cannot change while the model has pending changes, so
     * it is retried shortly until those are submitted.
     *
     * @param {string} accessToken the renewed access token
     */
    applyAccessToken: function _applyAccessToken(accessToken) {
      const model = this.getModel();
      if (!model || !this._modelToken) {
        return;
      }
      try {
        model.changeHttpHeaders({
          Authorization: `Bearer ${accessToken}`
        });
        this._modelToken = accessToken;
      } catch {
        setTimeout(() => {
          if (AuthenticationService.getSession()?.accessToken === accessToken) {
            this.applyAccessToken(accessToken);
          }
        }, TOKEN_RETRY_MS);
      }
    },
    /**
     * Returns the app base path on the managed app router / launchpad
     * (e.g. `/<dest-guid>.<app-name>.<artifact>-<version>`), used to prefix the
     * OData service URL so the managed app router routes requests back to this
     * app's xs-app.json. Returns an empty string when the app runs at the root.
     */
    getLaunchpadAppBasePath: function _getLaunchpadAppBasePath() {
      const pathname = window.location.pathname;
      return pathname.replace(/\/index\.html$/, "").replace(/\/+$/, "");
    },
    prepareBtpServiceModel: function _prepareBtpServiceModel() {
      AuthApi.setServiceUrl(`${this.getLaunchpadAppBasePath()}/api/service/ExpenseManager/`);
      this.setServiceModel("");
    },
    prepareStandaloneServiceModel: function _prepareStandaloneServiceModel() {
      if (!AuthApi.getConfig().odataService) {
        this.applyManifestServiceUrl();
      }
      this.setServiceModel("");
    },
    applyManifestServiceUrl: function _applyManifestServiceUrl() {
      const manifest = this.getManifestObject();
      const uri = manifest?.get?.("/sap.app/dataSources/mainService/uri");
      if (uri) {
        AuthApi.setServiceUrl(uri);
      }
    },
    handleSessionExpired: function _handleSessionExpired() {
      if (this._sessionExpiredShown) {
        return;
      }
      this._sessionExpiredShown = true;
      SessionStorage.clear();
      this._serviceModelPromise = null;
      const bundle = this.getModel("i18n")?.getResourceBundle();
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
    },
    handleAuthError: function _handleAuthError(message) {
      const bundle = this.getModel("i18n")?.getResourceBundle();
      const prefix = bundle?.getText("authErrorPrefix") ?? "Erro ao autenticar, motivo";
      const reason = /failed to fetch|networkerror|load failed/i.test(message) ? bundle?.getText("authUnreachable") ?? message : message;
      this._sessionExpiredShown = true;
      MessageBox.error(`${prefix}: ${reason}`, {
        onClose: () => {
          this._sessionExpiredShown = false;
          AuthenticationService.clearAuthError();
          this.getRouter().navTo("Login");
        }
      });
    }
  });
  return Component;
});
//# sourceMappingURL=Component-dbg.js.map
