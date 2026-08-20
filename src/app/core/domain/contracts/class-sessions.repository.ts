import { ClassSession } from '../entities/class-session';
import { WaitingListEntry } from '../entities/waiting-list';

/**
 * Las clases de la agenda y su lista de espera. Clase abstracta por el mismo motivo que el
 * resto de los contratos: hace de token DI sin arrastrar @angular/core al dominio.
 *
 * `list` toma UNA fecha local ('yyyy-MM-dd') y no un rango: el ajuste de la ventana UTC del
 * backend es un detalle del borde HTTP y vive en la implementación, no en cada consumidor. Ya
 * estuvo repartido entre el repositorio del dashboard y su mapper.
 *
 * La lista de espera cuelga de acá, y no de un contrato propio, por el mismo criterio que puso
 * `/students/:id/plans` dentro de StudentsRepository: el endpoint es
 * `/class-sessions/:id/waiting-list` y un contrato aparte sólo agregaría un binding más.
 * `leaveWaitingList` es la excepción — pega a `/waiting-list/:id` — y se queda igual acá para
 * no partir en dos una operación y su inversa.
 */
export abstract class ClassSessionsRepository {
  abstract list(dateKey: string): Promise<ClassSession[]>;
  abstract waitingList(sessionId: string): Promise<WaitingListEntry[]>;
  abstract joinWaitingList(sessionId: string, studentId: string): Promise<void>;
  /** `entryId` es el id de la ANOTACIÓN (`WaitingListEntry.id`), no el del alumno. */
  abstract leaveWaitingList(entryId: string): Promise<void>;
}
