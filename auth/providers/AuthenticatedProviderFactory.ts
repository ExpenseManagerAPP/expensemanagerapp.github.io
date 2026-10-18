import Environment, { EnvironmentType } from "../../util/Environment";
import { AppAuthenticationProvider } from "./AppAuthenticationProvider";
import { MockAuthenticationProvider } from "./MockAuthenticationProvider";
import { IAuthenticationProvider } from "../IAuthenticationProvider";
import { AuthApi } from "../AuthApi";

export class AuthenticatedProviderFactory {

    public static create(): IAuthenticationProvider {
        switch (Environment.current()) {
            case EnvironmentType.GITHUB:
                return new AppAuthenticationProvider();
            case EnvironmentType.LOCAL:
                return AuthApi.getConfig().auth
                    ? new AppAuthenticationProvider()
                    : new MockAuthenticationProvider();
            default:
                return new MockAuthenticationProvider();
        }
    }

}
