import { IAuthenticationProvider } from "../IAuthenticationProvider";
import { UserSession } from "../models/UserSession";
import { SessionStorage } from "../storage/SessionStorage";

export class BtpAuthenticationProvider implements IAuthenticationProvider {

    /**
     * On the BTP launchpad the managed app router authenticates the user,
     * so the password form simply opens the platform session.
     */
    public loginWithPassword(): Promise<UserSession> {
        return Promise.resolve({
            accessToken: "btp-session-token",
            expiresAt: Date.now() + 3600000,
            userName: "Usuário BTP"
        });
    }

    public refresh(): Promise<UserSession | null> {
        return Promise.resolve(null);
    }

    public changePassword(): Promise<UserSession> {
        return Promise.reject(new Error("Password changes are managed by the platform"));
    }

    public logout(): Promise<void> {
        SessionStorage.clear();

        if (typeof window !== "undefined") {
            const redirectTarget = encodeURIComponent(window.location.href);
            window.location.assign(`${window.location.origin}/logout?redirect=${redirectTarget}`);
        }

        return Promise.resolve();
    }

}
