export type BadgeKey = 'alerts' | 'payments';
export type NavGroup = 'Operación' | 'Gestión';
export type NavIcon = 'dashboard' | 'grupos' | 'alumnos' | 'comercial' | 'plantillas' | 'config';

export interface NavItem {
  readonly label: string;   // etiqueta en la sidebar
  readonly short: string;   // etiqueta en la tab-bar móvil
  readonly path: string;    // ruta absoluta
  readonly group: NavGroup;
  readonly icon: NavIcon;
  readonly badge?: BadgeKey;
}

export const NAV_GROUPS: readonly NavGroup[] = ['Operación', 'Gestión'];

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard',             short: 'Panel',      path: '/dashboard',  group: 'Operación', icon: 'dashboard',  badge: 'alerts' },
  { label: 'Grupos y Clases',       short: 'Grupos',     path: '/grupos',     group: 'Operación', icon: 'grupos' },
  { label: 'Alumnos y Créditos',    short: 'Alumnos',    path: '/alumnos',    group: 'Operación', icon: 'alumnos' },
  { label: 'Comercial y Pagos',     short: 'Pagos',      path: '/comercial',  group: 'Gestión',   icon: 'comercial',  badge: 'payments' },
  { label: 'Plantillas y WhatsApp', short: 'Plantillas', path: '/plantillas', group: 'Gestión',   icon: 'plantillas' },
  { label: 'Configuración',         short: 'Config',     path: '/configuracion', group: 'Gestión',   icon: 'config' },
];
