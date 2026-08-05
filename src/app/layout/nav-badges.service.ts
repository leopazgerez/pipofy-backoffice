import { Injectable, signal } from '@angular/core';
import type { BadgeKey } from './nav.model';

// ponytail: valores fijos. Cuando existan los facades de Dashboard/Comercial,
// estos contadores reflejarán su estado (alertas por vencer / pagos pendientes)
// en lugar de constantes. No se arma un repo de dominio para dos números.
@Injectable()
export class NavBadgesService {
  readonly counts = signal<Record<BadgeKey, number>>({ alerts: 6, payments: 3 });
}
