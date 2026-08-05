/**
 * Test double de <dialog> — jsdom no lo implementa.
 *
 * jsdom 29.1.1 SÍ expone `HTMLDialogElement` como constructor (un <dialog> creado con
 * createElement tiene ese prototipo), pero deja `showModal`, `close` y `open` en
 * `undefined`. Sin esto, todo spec que abra un modal explota.
 *
 * Se parchea `HTMLDialogElement.prototype` y NO `HTMLElement.prototype`, para no pisarle
 * el `open` a <details> (que jsdom sí implementa, en HTMLDetailsElement).
 *
 * ALCANCE — lo que este double NO simula: el foco atrapado, el cierre con Esc, el `inert`
 * sobre el resto del documento y el ::backdrop. Todo eso lo da el <dialog> nativo del
 * navegador de verdad y es EXACTAMENTE por lo que ModalComponent es un wrapper fino.
 * Los specs verifican la lógica propia del componente; ese comportamiento se verifica
 * mirando la pantalla (Task 10, Step 8).
 *
 * El guard `if` hace que esto desaparezca solo el día que jsdom lo implemente.
 */
const proto = HTMLDialogElement.prototype as unknown as { showModal?: unknown };

if (typeof proto.showModal !== 'function') {
  Object.defineProperty(HTMLDialogElement.prototype, 'open', {
    configurable: true,
    get(this: HTMLDialogElement) { return this.hasAttribute('open'); },
    set(this: HTMLDialogElement, v: boolean) {
      if (v) this.setAttribute('open', ''); else this.removeAttribute('open');
    },
  });

  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) { this.setAttribute('open', ''); },
  });

  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      if (!this.hasAttribute('open')) return;   // idempotente, como el nativo
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    },
  });
}
