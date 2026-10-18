import { UserSession } from "./models/UserSession";

interface AuthConfig {
    baseUrl: string;
}

interface RuntimeConfig {
    btpHost: string;
    odataService: string;
    auth?: AuthConfig;
}

interface ApiResponse {
    error?: string;
    error_description?: string;
}

interface TokenResponse extends ApiResponse {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    user_name?: string;
    name?: string;
    role?: string;
    must_change_password?: boolean;
}

interface SignUpResponse extends ApiResponse {
    status: SignUpStatus;
}

/** "confirmation_sent": a link went to the e-mail; "pending_approval": an admin must approve. */
export type SignUpStatus = "confirmation_sent" | "pending_approval";

/**
 * Failure returned by the CAP /auth endpoints, keeping the error code
 * (e.g. invalid_credentials, too_many_attempts) so the UI can show a precise message.
 */
export class AuthRequestError extends Error {
    public constructor(public readonly code: string, message: string, public readonly status: number) {
        super(message);
        this.name = "AuthRequestError";
    }
}

let runtimeConfig: RuntimeConfig = {
    btpHost: "",
    odataService: ""
};

/**
 * Client of the app's own authentication API (/auth on the CAP host) and
 * holder of the runtime configuration (service and auth URLs).
 */
export class AuthApi {

    public static getConfig(): RuntimeConfig {
        return runtimeConfig;
    }

    public static setServiceUrl(url: string): void {
        runtimeConfig.odataService = url;
    }

    /**
     * Local runs go through the ui5 proxy, which forwards /api and /auth to the CAP server.
     */
    public static setLocalOverrides(): void {
        runtimeConfig.odataService = "/api/service/ExpenseManager/";

        if (runtimeConfig.auth) {
            runtimeConfig.auth.baseUrl = "/auth";
        }
    }

    public static async loadRuntimeConfig(): Promise<void> {
        if (runtimeConfig.auth) {
            return;
        }

        const url = sap.ui.require.toUrl("apps/dflc/expensemanager/config/runtime-config.json");
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Falha ao carregar a configuração de runtime.");
        }

        const payload = await response.json() as Partial<RuntimeConfig>;

        runtimeConfig = {
            btpHost: payload.btpHost ?? "",
            odataService: payload.odataService ?? "",
            auth: payload.auth
        };
    }

    public static loginWithPassword(username: string, password: string): Promise<UserSession> {
        return this.postForSession("/password", { username, password });
    }

    public static refresh(refreshToken: string): Promise<UserSession> {
        return this.postForSession("/refresh", { refresh_token: refreshToken });
    }

    public static changePassword(accessToken: string, currentPassword: string, newPassword: string): Promise<UserSession> {
        return this.postForSession(
            "/change-password",
            { current_password: currentPassword, new_password: newPassword },
            accessToken
        );
    }

    public static async signUp(email: string, name: string, password: string, lang: string): Promise<SignUpStatus> {
        return (await this.post<SignUpResponse>("/signup", { email, name, password, lang })).status;
    }

    public static confirmAccount(token: string): Promise<UserSession> {
        return this.postForSession("/confirm", { token });
    }

    public static async requestPasswordReset(email: string, lang: string): Promise<void> {
        await this.post<ApiResponse>("/forgot-password", { email, lang });
    }

    public static resetPassword(token: string, newPassword: string): Promise<UserSession> {
        return this.postForSession("/reset-password", { token, new_password: newPassword });
    }

    private static async postForSession(path: string, body: object, accessToken?: string): Promise<UserSession> {
        const payload = await this.post<TokenResponse>(path, body, accessToken);

        if (!payload.access_token) {
            throw new AuthRequestError("login_failed", "Login failed", 0);
        }

        return this.createSession(payload);
    }

    private static async post<T extends ApiResponse>(path: string, body: object, accessToken?: string): Promise<T> {
        const baseUrl = this.getConfig().auth?.baseUrl;

        if (!baseUrl) {
            throw new AuthRequestError("not_configured", "Authentication is not configured", 0);
        }

        let response: Response;

        try {
            response = await fetch(`${baseUrl}${path}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
                },
                body: JSON.stringify(body)
            });
        } catch {
            throw new AuthRequestError("backend_unavailable", "Authentication service is unreachable", 0);
        }

        const payload = await response.json().catch(() => ({})) as T;

        if (!response.ok || payload.error) {
            throw new AuthRequestError(payload.error ?? "login_failed", payload.error_description ?? "Login failed", response.status);
        }

        return payload;
    }

    private static createSession(tokenResponse: TokenResponse): UserSession {
        const expiresIn = Math.max(tokenResponse.expires_in ?? 3600, 60);

        return {
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
            expiresAt: Date.now() + (expiresIn * 1000),
            userName: tokenResponse.user_name ?? "",
            name: tokenResponse.name ?? "",
            role: tokenResponse.role ?? "User",
            mustChangePassword: !!tokenResponse.must_change_password
        };
    }

}
