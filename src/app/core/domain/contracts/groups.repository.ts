import { GroupsSnapshot, SaveAttendanceRequest } from '../entities/group';

/**
 * Contrato del repositorio de grupos. Clase abstracta a propósito: hace de token DI sin
 * arrastrar @angular/core al dominio. La impl se bindea en los providers de la ruta lazy
 * (grupos.providers.ts), nunca con providedIn: 'root'.
 *
 * La escritura devuelve el snapshot COMPLETO nuevo, igual que cancelSession: así la facade
 * hace un setData() y la pantalla queda consistente sin una segunda lectura.
 *
 * ponytail: un solo snapshot con todos los rosters. Con 6-30 grupos por club no se nota; si
 * un club llega a cientos, la salida es partir en listGroups() liviano + getGroup(id) completo
 * y mover el filtrado al servidor. No antes.
 */
export abstract class GroupsRepository {
  abstract getGroups(clubId: string): Promise<GroupsSnapshot>;
  abstract saveAttendance(clubId: string, req: SaveAttendanceRequest): Promise<GroupsSnapshot>;
}
