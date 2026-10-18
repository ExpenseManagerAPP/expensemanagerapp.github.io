import { IAuthenticationProvider } from "./IAuthenticationProvider";
import { UserSession } from "./models/UserSession";
import { SessionStorage } from "./storage/SessionStorage";
import { AuthApi, type SignUpStatus } from "./AuthApi";
import Localization from "sap/base/i18n/Localization";

/** How long before the access token expires the session is renewed. */
const REFRESH_AHEAD_MS = 2 * 60 * 1000;
const MIN_REFRESH_DELAY_MS = 5 * 1000;

export class AuthenticationService {

    private static provider: IAuthenticationProvider;

    private static sessionExpiredHandler: (() => void) | null = null;

    private static sessionRefreshedHandler: ((session: UserSession) => void) | null = null;

    private static signedOutHandler: (() => void) | null = null;

    private static authErrorHandler: ((message: string) => void) | null = null;

    private static authErrorPending = false;

    private static refreshTimer: ReturnType<typeof setTimeout> | null = null;

    public static initialize(provider: IAuthenticationProvider): void {

        this.provider = provider;

    }

    public static async loginWithPassword(username: string, password: string): Promise<void> {

        this.storeSession(await this.provider.loginWithPassword(username, password));

    }

    public static async changePassword(currentPassword: string, newPassword: string): Promise<void> {

        const session = this.getSession();

        if (!session) {
            throw new Error("No active session");
        }

        this.storeSession(await this.provider.changePassword(session, currentPassword, newPassword));

    }

    public static signUp(email: string, name: string, password: string): Promise<SignUpStatus> {

        return AuthApi.signUp(email, name, password, Localization.getLanguage());

    }

    /** Activates the account of an e-mail link and opens its session. */
    public static async confirmAccount(token: string): Promise<void> {

        this.storeSession(await AuthApi.confirmAccount(token));

    }

    public static requestPasswordReset(email: string): Promise<void> {

        return AuthApi.requestPasswordReset(email, Localization.getLanguage());

    }

    /** Sets the password of an e-mail link and opens the new session. */
    public static async resetPassword(token: string, newPassword: string): Promise<void> {

        this.storeSession(await AuthApi.resetPassword(token, newPassword));

    }

    public static async logout(): Promise<void> {

        this.cancelRefresh();

        SessionStorage.clear();

        await this.provider.logout();

        this.signedOutHandler?.();

    }

    public static getSession(): UserSession | null {

        return SessionStorage.load();

    }

    public static hasValidSession(): boolean {

        const session = this.getSession();

        return !!session?.accessToken && session.expiresAt > Date.now();

    }

    public static mustChangePassword(): boolean {

        return !!this.getSession()?.mustChangePassword;

    }

    public static isAdmin(): boolean {

        return this.getSession()?.role === "Admin";

    }

    /**
     * True when the stored session is still valid or could be renewed with
     * its refresh token (e.g. a tab reopened after the access token expired).
     */
    public static async isAuthenticated(): Promise<boolean> {

        if (this.hasValidSession()) {
            this.scheduleRefresh();
            return true;
        }

        return this.refreshSession();

    }

    public static async refreshSession(): Promise<boolean> {

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

    public static onSessionRefreshed(handler: (session: UserSession) => void): void {

        this.sessionRefreshedHandler = handler;

    }

    public static onSignedOut(handler: () => void): void {

        this.signedOutHandler = handler;

    }

    public static onSessionExpired(handler: () => void): void {

        this.sessionExpiredHandler = handler;

    }

    public static notifySessionExpired(): void {

        this.cancelRefresh();

        SessionStorage.clear();

        this.sessionExpiredHandler?.();

    }

    public static onAuthError(handler: (message: string) => void): void {

        this.authErrorHandler = handler;

    }

    public static notifyAuthError(message: string): void {

        this.authErrorPending = true;

        this.authErrorHandler?.(message);

    }

    public static isAuthErrorPending(): boolean {

        return this.authErrorPending;

    }

    public static clearAuthError(): void {

        this.authErrorPending = false;

    }

    private static storeSession(session: UserSession): void {

        SessionStorage.save(session);

        this.scheduleRefresh();

    }

    /**
     * Renews the access token shortly before it expires, so an open app keeps
     * working instead of sending the user back to the login page.
     */
    private static scheduleRefresh(): void {

        this.cancelRefresh();

        const session = this.getSession();

        if (!session?.refreshToken) {
            return;
        }

        const delay = Math.max(session.expiresAt - Date.now() - REFRESH_AHEAD_MS, MIN_REFRESH_DELAY_MS);

        this.refreshTimer = setTimeout(() => {
            void this.refreshSession().then((renewed) => {
                if (!renewed && !this.hasValidSession()) {
                    this.notifySessionExpired();
                }
            });
        }, delay);

    }

    private static cancelRefresh(): void {

        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }

    }

}
