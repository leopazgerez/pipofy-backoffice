import { describe, it, expect } from 'vitest';
import { catalogLabel } from './catalog-labels';

describe('catalogLabel', () => {
  it('traduce los valores del seed a etiquetas legibles', () => {
    // El seed guarda los nombres en snake_case (§4.8): no se puede mostrar
    // `polvo_ladrillo` en un select.
    expect(catalogLabel('polvo_ladrillo')).toBe('Polvo de ladrillo');
    expect(catalogLabel('sintetico')).toBe('Sintético');
    expect(catalogLabel('mantenimiento')).toBe('En mantenimiento');
  });

  it('humaniza un valor desconocido en vez de romper', () => {
    // Si el seed suma un valor nuevo, la UI lo muestra aceptable sin tocar código.
    expect(catalogLabel('cesped_natural')).toBe('Cesped natural');
  });
});

describe('catalogLabel — tipos de plan', () => {
  it('traduce los tres del seed', () => {
    expect(catalogLabel('mensual_grupal')).toBe('Mensual grupal');
    expect(catalogLabel('individual')).toBe('Individual');
    expect(catalogLabel('nivelacion')).toBe('Nivelación');
  });

  it('nivelacion necesita entrada explícita: el fallback pierde la tilde', () => {
    expect(catalogLabel('nivelacion')).not.toBe('Nivelacion');
  });
});
