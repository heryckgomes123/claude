export const APP_NAME = "R BEAUTY OS";
export const APP_MODULE = "Command Center";
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "America/Sao_Paulo";
export const PANEL_PATH = "/painel";

export const SESSION_COOKIE = "rb_session";
/** Sessão sem "lembrar acesso". */
export const SESSION_TTL_SHORT_MS = 12 * 60 * 60 * 1000;
/** Sessão com "lembrar acesso". */
export const SESSION_TTL_LONG_MS = 30 * 24 * 60 * 60 * 1000;

export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_WINDOW_MINUTES = 15;
