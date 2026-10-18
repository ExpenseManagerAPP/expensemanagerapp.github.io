/** Routes for visitors without a session (a signed-in user goes to the start page instead). */
export const GUEST_ROUTES = ["Login", "Signup", "ForgotPassword"];

/** Routes opened from e-mail links: they work with or without a session. */
export const EMAIL_LINK_ROUTES = ["ConfirmEmail", "ResetPassword"];

/** Routes shown outside the workspace shell (no person, no tabs). */
export const OUTSIDE_WORKSPACE_ROUTES = [...GUEST_ROUTES, ...EMAIL_LINK_ROUTES, "ChangePassword", "Admin"];
