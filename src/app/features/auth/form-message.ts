import { DomainError, domainErrorMessage } from '@domain/errors';

/**
 * El mensaje que muestra un formulario de auth: gana el error LOCAL (validación de la
 * pantalla, que el usuario acaba de provocar) sobre el que dejó la facade.
 *
 * Estaba escrito igual en login, cambiar-clave y reset-password. Es una función y no un
 * computed para que cada pantalla arme el suyo con sus propios signals.
 */
export function formMessage(local: string, err: DomainError | null): string {
  if (local) return local;
  return err ? domainErrorMessage(err) : '';
}
