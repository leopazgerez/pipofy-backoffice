import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { ReservasFacade } from '../reservas.facade';
import { SesionModalComponent } from '../components/sesion-modal.component';
import { ClassSession, occupiedSpots } from '@domain/entities/class-session';
import { Student } from '@domain/entities/student';
import { StudentsRepository } from '@domain/contracts/students.repository';
import { CourtsRepository } from '@domain/contracts/courts.repository';
import { CoachesRepository } from '@domain/contracts/coaches.repository';
import { CategoryGroupsRepository } from '@domain/contracts/category-groups.repository';
import { domainErrorMessage } from '@domain/errors';
import { localHhMm } from '@domain/local-date';

@Component({
  selector: 'app-reservas-page',
  standalone: true,
  imports: [SesionModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reservas-page.component.html',
  styleUrl: './reservas-page.component.css',
})
export class ReservasPageComponent {
  protected readonly facade = inject(ReservasFacade);
  private readonly studentsRepo = inject(StudentsRepository);
  private readonly courtsRepo = inject(CourtsRepository);
  private readonly coachesRepo = inject(CoachesRepository);
  private readonly groupsRepo = inject(CategoryGroupsRepository);

  private readonly modal = viewChild.required(SesionModalComponent);

  protected readonly students = signal<readonly Student[]>([]);
  private readonly courtName = signal<ReadonlyMap<string, string>>(new Map());
  private readonly coachName = signal<ReadonlyMap<string, string>>(new Map());
  private readonly groupName = signal<ReadonlyMap<string, string>>(new Map());

  constructor() {
    this.facade.clearError();
    if (!this.facade.data() && !this.facade.loading()) void this.facade.load();

    // Los tres catálogos de nombres y la lista de alumnos fallan en SILENCIO, igual que los
    // catálogos de Canchas: sin ellos la tabla muestra ids en vez de nombres, pero sigue
    // siendo usable, y el error de las sesiones es el que importa.
    //
    // ponytail: cuatro lecturas en paralelo (alumnos + 3 catálogos) en cada carga de esta
    // pantalla, sin cachear entre navegaciones. Techo: recién se nota con miles de alumnos.
    // Salida: un endpoint agregador — el mismo que le falta a /dashboard (ver
    // http-dashboard.repository.ts, que compone su snapshot con el mismo problema).
    void this.studentsRepo.list().then((v) => this.students.set(v)).catch(() => undefined);
    void this.courtsRepo.list()
      .then((v) => this.courtName.set(new Map(v.map((c) => [c.id, c.name]))))
      .catch(() => undefined);
    void this.coachesRepo.list()
      .then((v) => this.coachName.set(new Map(v.map((c) => [c.id, c.displayName]))))
      .catch(() => undefined);
    void this.groupsRepo.list()
      .then((v) => this.groupName.set(new Map(v.map((g) => [g.id, g.name]))))
      .catch(() => undefined);
  }

  /** Se le pasa al modal como input para que arme su subtítulo sin repetir los tres mapas. */
  protected readonly label = (s: ClassSession): string =>
    `${this.court(s)} · ${this.hora(s)} · ${this.grupo(s)}`;

  protected court(s: ClassSession): string { return this.courtName().get(s.courtId) || '—'; }
  protected coach(s: ClassSession): string { return this.coachName().get(s.coachId) || '—'; }
  protected grupo(s: ClassSession): string {
    return this.groupName().get(s.categoryGroupId) || '—';
  }

  /**
   * 'HH:mm' local. `startAt` puede ser null: Prisma lo permite y nadie lo valida — esa
   * tolerancia es de la página, `localHhMm` (domain) ya recibe un `Date` válido.
   */
  protected hora(s: ClassSession): string {
    if (s.startAt === null) return '—';
    const at = new Date(s.startAt);
    if (Number.isNaN(at.getTime())) return '—';
    return localHhMm(at);
  }

  protected cupo(s: ClassSession): string {
    return `${occupiedSpots(s)}/${s.capacity}`;
  }

  protected errorText(): string {
    const err = this.facade.error();
    return err ? domainErrorMessage(err) : '';
  }

  protected onDate(e: Event): void {
    void this.facade.setDate((e.target as HTMLInputElement).value);
  }

  protected openSession(session: ClassSession): void {
    this.modal().open(session);
  }
}
