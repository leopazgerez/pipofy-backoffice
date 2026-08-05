import * as v from 'valibot';
import { GroupsRepository } from '@domain/contracts/groups.repository';
import { GroupsSnapshot, SaveAttendanceRequest } from '@domain/entities/group';
import { GroupNotFoundError } from '@domain/errors';
import { applyAttendance } from '@domain/use-cases/apply-attendance.use-case';
import { GroupsDtoSchema } from '../dto/groups.dto';
import { toGroupsSnapshot } from '../mappers/groups.mapper';
import { GROUPS_SEED } from './groups.seed';

const SIMULATED_LATENCY_MS = 600;

// ponytail: mock en memoria para la demo visual sin backend. Valida la semilla con el mismo
// schema que usaría el HTTP real (ejercita el borde DTO→entidad) y la devuelve con una latencia
// simulada. Se bindea por useFactory (ver grupos.providers.ts).
//
// SIN @Injectable(): con `strictInjectionParameters: true` el compilador Angular exige un token
// DI para CADA parámetro del constructor de una clase @Injectable(), y `number` (latencyMs) no
// es un token válido (NG2003). Como se construye a mano en la factory, no hace falta el decorador.
export class InMemoryGroupsRepository implements GroupsRepository {
  // Estado VIVO del demo: se siembra UNA sola vez y las mutaciones persisten mientras viva la
  // instancia. Re-parsear la semilla en cada getGroups() haría desaparecer cada asistencia
  // registrada en la lectura siguiente — fue un bug real del repo del dashboard.
  private snapshot: GroupsSnapshot = toGroupsSnapshot(v.parse(GroupsDtoSchema, GROUPS_SEED));

  constructor(private readonly latencyMs: number = SIMULATED_LATENCY_MS) {}

  getGroups(_clubId: string): Promise<GroupsSnapshot> {
    return this.delay(this.snapshot);
  }

  saveAttendance(_clubId: string, req: SaveAttendanceRequest): Promise<GroupsSnapshot> {
    const group = this.snapshot.groups.find((g) => g.id === req.groupId);
    // Guard obligatorio: applyAttendance recibe el Group ya resuelto, así que NUNCA puede
    // detectar un grupo inexistente. Ese error es de esta capa.
    if (!group) return Promise.reject(new GroupNotFoundError(req.groupId));

    try {
      // LA MUTACIÓN VA ANTES DEL AWAIT DE LATENCIA, y de eso depende toda la defensa
      // anti-doble-descuento de applyAttendance. Si primero se esperara la latencia, dos llamadas
      // dentro de la ventana de 600 ms leerían AMBAS status 'scheduled', las dos entrarían en modo
      // tomar y las dos descontarían créditos. Con la mutación adelante, la segunda lee
      // 'completed' y cae en modo editar, que no toca saldos.
      // applyAttendance lanza (sesión inexistente / cancelada): sale sincrónico, sin mutar nada.
      const updated = applyAttendance(group, req.sessionId, req.marks, req.discountAbsences);
      this.snapshot = {
        ...this.snapshot,
        groups: this.snapshot.groups.map((g) => (g.id === updated.id ? updated : g)),
      };
      return this.delay(this.snapshot);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  // El setTimeout es incondicional a propósito, incluso con latencyMs 0. Cambiarlo por
  // Promise.resolve() cuando es 0 PARECE que dejaría a los specs de página usar sólo
  // whenStable(), pero está probado que rompe los tests: whenStable() no drena la cola de
  // microtareas hasta agotarla, y la cadena load()→run()→setData() no está registrada en
  // PendingTasks. Lo que los destraba es el límite de MACROTAREA (el flushRepo de los specs).
  private delay<T>(value: T): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(value), this.latencyMs));
  }
}
