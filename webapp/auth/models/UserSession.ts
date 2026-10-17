export interface UserSession {

    accessToken: string;

    refreshToken?: string;

    expiresAt: number;

    userName: string;

    name?: string;

    role?: string;

    mustChangePassword?: boolean;

}
