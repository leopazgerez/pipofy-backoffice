import { Injectable } from '@angular/core';

const LS_KEY = 'setpoint:grupo-items:v1';

type Snapshot = Record<string, string[]>;

/**
 * Qué categorías tiene cada grupo, SEGÚN ESTE NAVEGADOR.
 *
 * No es un cache de la API: es una pista. Ningún endpoint del backend devuelve los items de un
 * grupo, así que sin esto el modal no tendría nada que mostrar. Puede estar desactualizada
 * (otro navegador, otro usuario, una carga por SQL) y el modal lo dice al pie; el repositorio
 * la corrige sola tratando el 409 y el 404 como éxito.
 *
 * `localStorage` y no `sessionStorage` — a diferencia de OnboardingPersistenceService, que
 * persiste el borrador de UN wizard —: la asignación se carga una vez y tiene que seguir ahí
 * la semana que viene.
 *
 * Todo va envuelto en try/catch porque el storage puede estar lleno, bloqueado por el navegador
 * o sucio de una versión anterior, y ninguna de esas tres cosas justifica tumbar la pantalla.
 */
@Injectable()
export class GrupoItemsStore {
  read(groupId: string): string[] {
    return this.all()[groupId] ?? [];
  }

  write(groupId: string, categoryIds: readonly string[]): void {
    const next = { ...this.all(), [groupId]: [...categoryIds] };
    this.persist(next);
  }

  forget(groupId: string): void {
    const next = this.all();
    delete next[groupId];
    this.persist(next);
  }

  private all(): Snapshot {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      return typeof parsed === 'object' && parsed !== null ? (parsed as Snapshot) : {};
    } catch {
      return {};
    }
  }

  private persist(snapshot: Snapshot): void {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(snapshot));
    } catch {
      /* storage lleno o bloqueado: la pista se pierde, el modal sigue funcionando */
    }
  }
}
