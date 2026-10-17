import { UserSession } from "./models/UserSession";

export interface IAuthenticationProvider {

    loginWithPassword(username: string, password: string): Promise<UserSession>;

    /** A fresh session for the refresh token, or null when it cannot be renewed. */
    refresh(session: UserSession): Promise<UserSession | null>;

    changePassword(session: UserSession, currentPassword: string, newPassword: string): Promise<UserSession>;

    logout(): Promise<void>;

}
