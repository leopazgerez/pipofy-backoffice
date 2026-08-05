import { Registration } from '../entities/registration';
import { Session } from '../entities/session';

/**
 * abstract class = token DI + tipo + contrato, en TS puro (sin @angular/* en domain).
 *
 * Absorbe lo que antes era RegistrationRepository: con el wizard reducido a los campos que
 * acepta POST /auth/signup, un contrato separado para "registro" ya no representa nada
 * distinto de "auth".
 */
export abstract class AuthRepository {
  /**
   * La API devuelve { accessToken, refreshToken } en el signup, pero se DESCARTAN a
   * propósito: el backend bloquea el login hasta verificar el email, así que guardarlos
   * crearía un estado "logueado a medias" que depende de que JwtAuthGuard no chequee
   * emailVerifiedAt. El usuario va a la pantalla de verificación.
   */
  abstract signup(reg: Registration): Promise<void>;
  abstract login(email: string, password: string): Promise<Session>;
  abstract refresh(refreshToken: string): Promise<Session>;
  abstract logout(refreshToken: string): Promise<void>;
  abstract verifyEmail(token: string): Promise<void>;
  abstract resendVerification(email: string): Promise<void>;
}
