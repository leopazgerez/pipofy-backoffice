/**
 * Sesión emitida por la API. `mustChangePassword` solo viene en la respuesta de login;
 * el refresh devuelve nada más que el par de tokens (ver SessionStore.setTokens).
 */
export interface Session {
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
}
