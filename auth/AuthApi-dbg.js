sap.ui.define([], function () {
  "use strict";

  /**
   * Failure returned by the CAP /auth endpoints, keeping the error code
   * (e.g. invalid_credentials, too_many_attempts) so the UI can show a precise message.
   */
  class AuthRequestError extends Error {
    constructor(code, message, status) {
      super(message);
      this.code = code;
      this.status = status;
      this.name = "AuthRequestError";
    }
  }
  let runtimeConfig = {
    btpHost: "",
    odataService: ""
  };

  /**
   * Client of the app's own authentication API (/auth on the CAP host) and
   * holder of the runtime configuration (service and auth URLs).
   */
  class AuthApi {
    static getConfig() {
      return runtimeConfig;
    }
    static setServiceUrl(url) {
      runtimeConfig.odataService = url;
    }

    /**
     * Local runs go through the ui5 proxy, which forwards /api and /auth to the CAP server.
     */
    static setLocalOverrides() {
      runtimeConfig.odataService = "/api/service/ExpenseManager/";
      if (runtimeConfig.auth) {
        runtimeConfig.auth.baseUrl = "/auth";
      }
    }
    static async loadRuntimeConfig() {
      if (runtimeConfig.auth) {
        return;
      }
      const url = sap.ui.require.toUrl("apps/dflc/expensemanager/config/runtime-config.json");
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Falha ao carregar a configuração de runtime.");
      }
      const payload = await response.json();
      runtimeConfig = {
        btpHost: payload.btpHost ?? "",
        odataService: payload.odataService ?? "",
        auth: payload.auth
      };
    }
    static async loginWithPassword(username, password) {
      return this.createSession(await this.post("/password", {
        username,
        password
      }));
    }
    static async refresh(refreshToken) {
      return this.createSession(await this.post("/refresh", {
        refresh_token: refreshToken
      }));
    }
    static async changePassword(accessToken, currentPassword, newPassword) {
      return this.createSession(await this.post("/change-password", {
        current_password: currentPassword,
        new_password: newPassword
      }, accessToken));
    }
    static async post(path, body, accessToken) {
      const baseUrl = this.getConfig().auth?.baseUrl;
      if (!baseUrl) {
        throw new AuthRequestError("not_configured", "Authentication is not configured", 0);
      }
      let response;
      try {
        response = await fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? {
              Authorization: `Bearer ${accessToken}`
            } : {})
          },
          body: JSON.stringify(body)
        });
      } catch {
        throw new AuthRequestError("backend_unavailable", "Authentication service is unreachable", 0);
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.error || !payload.access_token) {
        throw new AuthRequestError(payload.error ?? "login_failed", payload.error_description ?? "Login failed", response.status);
      }
      return payload;
    }
    static createSession(tokenResponse) {
      const expiresIn = Math.max(tokenResponse.expires_in ?? 3600, 60);
      return {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: Date.now() + expiresIn * 1000,
        userName: tokenResponse.user_name ?? "",
        name: tokenResponse.name ?? "",
        role: tokenResponse.role ?? "User",
        mustChangePassword: !!tokenResponse.must_change_password
      };
    }
  }
  var __exports = {
    __esModule: true
  };
  __exports.AuthRequestError = AuthRequestError;
  __exports.AuthApi = AuthApi;
  return __exports;
});
//# sourceMappingURL=AuthApi-dbg.js.map
