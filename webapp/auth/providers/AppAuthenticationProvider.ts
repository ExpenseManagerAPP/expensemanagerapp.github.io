import { IAuthenticationProvider } from "../IAuthenticationProvider";
import { UserSession } from "../models/UserSession";
import { SessionStorage } from "../storage/SessionStorage";
import { AuthApi } from "../AuthApi";

/**
 * Signs in against the app's own Users through the CAP /auth API.
 */
export class AppAuthenticationProvider implements IAuthenticationProvider {

    public loginWithPassword(username: string, password: string): Promise<UserSession> {
        return AuthApi.loginWithPassword(username, password);
    }

    public async refresh(session: UserSession): Promise<UserSession | null> {
        return session.refreshToken ? AuthApi.refresh(session.refreshToken) : null;
    }

    public changePassword(session: UserSession, currentPassword: string, newPassword: string): Promise<UserSession> {
        return AuthApi.changePassword(session.accessToken, currentPassword, newPassword);
    }

    public logout(): Promise<void> {
        SessionStorage.clear();
        return Promise.resolve();
    }

}
