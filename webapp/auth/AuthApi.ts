import { UserSession } from "./models/UserSession";

interface AuthConfig {
    baseUrl: string;
}

interface RuntimeConfig {
    btpHost: string;
    odataService: string;
    auth?: AuthConfig;
}

interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    user_name?: string;
    name?: string;
    role?: string;
    must_change_password?: boolean;
    error?: string;
    error_description?: string;
}

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

    public static async loginWithPassword(username: string, password: string): Promise<UserSession> {
        return this.createSession(await this.post("/password", { username, password }));
    }

    public static async refresh(refreshToken: string): Promise<UserSession> {
        return this.createSession(await this.post("/refresh", { refresh_token: refreshToken }));
    }

    public static async changePassword(accessToken: string, currentPassword: string, newPassword: string): Promise<UserSession> {
        return this.createSession(await this.post(
            "/change-password",
            { current_password: currentPassword, new_password: newPassword },
            accessToken
        ));
    }

    private static async post(path: string, body: object, accessToken?: string): Promise<TokenResponse> {
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

        const payload = await response.json().catch(() => ({})) as TokenResponse;

        if (!response.ok || payload.error || !payload.access_token) {
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
