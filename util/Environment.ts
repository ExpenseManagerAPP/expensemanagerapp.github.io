export enum EnvironmentType {

    LOCAL = "LOCAL",

    GITHUB = "GITHUB"

}

export default class Environment {

    public static current(): Environment {

        const host = window.location.hostname;

        if (host.includes("github.io")) {
            return EnvironmentType.GITHUB;
        }

        return EnvironmentType.LOCAL;
    }

}