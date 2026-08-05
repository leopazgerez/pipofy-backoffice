/**
 * Exige @ y un dominio con TLD de 2+. Vive en shared porque la usan onboarding y auth:
 * dejarla en una feature obligaría a la otra a importarla cruzando el boundary.
 */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
