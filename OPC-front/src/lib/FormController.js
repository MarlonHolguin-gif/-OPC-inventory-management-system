import { signal } from '@preact/signals-react';
import { backendError } from '@/lib/format';

/**
 * Base para los controllers de formulario CRUD (crear / editar con toggle de
 * visibilidad). Reemplaza el bloque `EMPTY_FORM` + `form`/`editingId`/
 * `showForm` + `startEdit`/`cancelEdit` que se repetía en cada página.
 *
 * Estado (signals):
 *  - form:       objeto con los campos del formulario
 *  - editingId:  id en edición, o null si es alta
 *  - visible:    ¿se muestra el formulario?
 *  - submitting: ¿hay un envío en curso?
 *  - error:      mensaje de error del último envío, o null
 *
 * El error se guarda en el propio controller (no en UiStore) para que la
 * alerta se pinte DENTRO del modal: el `GlobalAlert` del layout queda tapado
 * por el modal y el usuario no lo vería.
 */
export class FormController {
  constructor(emptyForm) {
    this._empty = emptyForm;
    this.form = signal({ ...emptyForm });
    this.editingId = signal(null);
    this.visible = signal(false);
    this.submitting = signal(false);
    this.error = signal(null);
  }

  get isEditing() {
    return this.editingId.value !== null;
  }

  setField = (key, value) => {
    this.form.value = { ...this.form.value, [key]: value };
  };

  // Fija un error de validación de cliente (se muestra igual que uno del
  // backend, dentro del modal). Devuelve false para poder cortar el submit
  // con `if (!this.reject('...')) return;` en una línea.
  reject(message) {
    this.error.value = message;
    return false;
  }

  openCreate = () => {
    this.form.value = { ...this._empty };
    this.editingId.value = null;
    this.error.value = null;
    this.visible.value = true;
  };

  openEdit(id, values) {
    this.editingId.value = id;
    this.form.value = { ...this._empty, ...values };
    this.error.value = null;
    this.visible.value = true;
  }

  close = () => {
    this.form.value = { ...this._empty };
    this.editingId.value = null;
    this.error.value = null;
    this.visible.value = false;
  };

  // Ejecuta una acción async contra el backend, gestionando `submitting` y
  // el error del formulario. Devuelve true si salió bien.
  async run(action, failMessage) {
    this.submitting.value = true;
    this.error.value = null;
    try {
      await action();
      return true;
    } catch (error) {
      this.error.value = backendError(error, failMessage);
      return false;
    } finally {
      this.submitting.value = false;
    }
  }
}
