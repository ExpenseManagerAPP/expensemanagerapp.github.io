import { IAuthenticationProvider } from "../IAuthenticationProvider";
import { UserSession } from "../models/UserSession";
import { SessionStorage } from "../storage/SessionStorage";

export class MockAuthenticationProvider implements IAuthenticationProvider {

    public loginWithPassword(username: string): Promise<UserSession> {
        return Promise.resolve({
            accessToken: "mock-token",
            expiresAt: Date.now() + 3600000,
            userName: username,
            role: "Admin"
        });
    }

    public refresh(): Promise<UserSession | null> {
        return Promise.resolve(null);
    }

    public changePassword(session: UserSession): Promise<UserSession> {
        return Promise.resolve({ ...session, mustChangePassword: false });
    }

    public logout(): Promise<void> {
        SessionStorage.clear();
        return Promise.resolve();
    }

}
