sap.ui.define(["./storage/SessionStorage", "./AuthApi", "sap/base/i18n/Localization"], function (___storage_SessionStorage, ___AuthApi, Localization) {
  "use strict";

  const SessionStorage = ___storage_SessionStorage["SessionStorage"];
  const AuthApi = ___AuthApi["AuthApi"];
  /** How long before the access token expires the session is renewed. */
  const REFRESH_AHEAD_MS = 2 * 60 * 1000;
  const MIN_REFRESH_DELAY_MS = 5 * 1000;
  class AuthenticationService {
    static sessionExpiredHandler = null;
    static sessionRefreshedHandler = null;
    static signedOutHandler = null;
    static authErrorHandler = null;
    static authErrorPending = false;
    static refreshTimer = null;
    static initialize(provider) {
      this.provider = provider;
    }
    static async loginWithPassword(username, password) {
      this.storeSession(await this.provider.loginWithPassword(username, password));
    }
    static async changePassword(currentPassword, newPassword) {
      const session = this.getSession();
      if (!session) {
        throw new Error("No active session");
      }
      this.storeSession(await this.provider.changePassword(session, currentPassword, newPassword));
    }
    static signUp(email, name, password) {
      return AuthApi.signUp(email, name, password, Localization.getLanguage());
    }

    /** Activates the account of an e-mail link and opens its session. */
    static async confirmAccount(token) {
      this.storeSession(await AuthApi.confirmAccount(token));
    }
    static requestPasswordReset(email) {
      return AuthApi.requestPasswordReset(email, Localization.getLanguage());
    }

    /** Sets the password of an e-mail link and opens the new session. */
    static async resetPassword(token, newPassword) {
      this.storeSession(await AuthApi.resetPassword(token, newPassword));
    }
    static async logout() {
      this.cancelRefresh();
      SessionStorage.clear();
      await this.provider.logout();
      this.signedOutHandler?.();
    }
    static getSession() {
      return SessionStorage.load();
    }
    static hasValidSession() {
      const session = this.getSession();
      return !!session?.accessToken && session.expiresAt > Date.now();
    }
    static mustChangePassword() {
      return !!this.getSession()?.mustChangePassword;
    }
    static isAdmin() {
      return this.getSession()?.role === "Admin";
    }

    /**
     * True when the stored session is still valid or could be renewed with
     * its refresh token (e.g. a tab reopened after the access token expired).
     */
    static async isAuthenticated() {
      if (this.hasValidSession()) {
        this.scheduleRefresh();
        return true;
      }
      return this.refreshSession();
    }
    static async refreshSession() {
      const session = this.getSession();
      if (!session?.refreshToken) {
        return false;
      }
      try {
        const renewed = await this.provider.refresh(session);
        if (!renewed) {
          return false;
        }
        this.storeSession(renewed);
        this.sessionRefreshedHandler?.(renewed);
        return true;
      } catch {
        return false;
      }
    }
    static onSessionRefreshed(handler) {
      this.sessionRefreshedHandler = handler;
    }
    static onSignedOut(handler) {
      this.signedOutHandler = handler;
    }
    static onSessionExpired(handler) {
      this.sessionExpiredHandler = handler;
    }
    static notifySessionExpired() {
      this.cancelRefresh();
      SessionStorage.clear();
      this.sessionExpiredHandler?.();
    }
    static onAuthError(handler) {
      this.authErrorHandler = handler;
    }
    static notifyAuthError(message) {
      this.authErrorPending = true;
      this.authErrorHandler?.(message);
    }
    static isAuthErrorPending() {
      return this.authErrorPending;
    }
    static clearAuthError() {
      this.authErrorPending = false;
    }
    static storeSession(session) {
      SessionStorage.save(session);
      this.scheduleRefresh();
    }

    /**
     * Renews the access token shortly before it expires, so an open app keeps
     * working instead of sending the user back to the login page.
     */
    static scheduleRefresh() {
      this.cancelRefresh();
      const session = this.getSession();
      if (!session?.refreshToken) {
        return;
      }
      const delay = Math.max(session.expiresAt - Date.now() - REFRESH_AHEAD_MS, MIN_REFRESH_DELAY_MS);
      this.refreshTimer = setTimeout(() => {
        void this.refreshSession().then(renewed => {
          if (!renewed && !this.hasValidSession()) {
            this.notifySessionExpired();
          }
        });
      }, delay);
    }
    static cancelRefresh() {
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }
    }
  }
  var __exports = {
    __esModule: true
  };
  __exports.AuthenticationService = AuthenticationService;
  return __exports;
});
//# sourceMappingURL=AuthenticationService-dbg.js.map
