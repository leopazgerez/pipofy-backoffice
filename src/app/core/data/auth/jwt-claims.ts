/**
 * JWTs codifican el payload en base64url (RFC 7515): `-`/`_` en vez de `+`/`/`, sin
 * padding `=`. `atob()` sólo entiende el alfabeto base64 estándar y tira `Invalid
 * character` apenas aparece un `-` o un `_` — que ocurre para cualquier token real cuyos
 * bytes caigan ahí, no es un caso raro. Por eso se traduce el alfabeto y se repone el
 * padding antes de decodificar.
 */
function base64UrlDecode(segment: string): string {
  const b64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  return atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '='));
}

/**
 * Lee el clubId del payload del access token.
 *
 * NO verifica la firma — eso es responsabilidad del backend, que rechaza cualquier token
 * adulterado. Acá solo se lee un dato para poblar TenantContext; si alguien falsea su
 * propio token en el browser, la API igual le responde 401.
 */
export function readClubId(accessToken: string): string | null {
  try {
    const payload: unknown = JSON.parse(base64UrlDecode(accessToken.split('.')[1]));
    if (typeof payload !== 'object' || payload === null) return null;
    const clubId = (payload as Record<string, unknown>)['clubId'];
    return typeof clubId === 'string' ? clubId : null;
  } catch {
    return null;
  }
}
