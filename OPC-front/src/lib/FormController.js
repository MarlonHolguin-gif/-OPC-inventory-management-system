import { signal } from '@preact/signals-react';
import { UiStore } from '@/stores/UiStore';
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
 */
export class FormController {
  constructor(emptyForm) {
    this._empty = emptyForm;
    this.form = signal({ ...emptyForm });
    this.editingId = signal(null);
    this.visible = signal(false);
    this.submitting = signal(false);
  }

  get isEditing() {
    return this.editingId.value !== null;
  }

  setField = (key, value) => {
    this.form.value = { ...this.form.value, [key]: value };
  };

  openCreate = () => {
    this.form.value = { ...this._empty };
    this.editingId.value = null;
    this.visible.value = true;
  };

  openEdit(id, values) {
    this.editingId.value = id;
    this.form.value = { ...this._empty, ...values };
    this.visible.value = true;
  }

  close = () => {
    this.form.value = { ...this._empty };
    this.editingId.value = null;
    this.visible.value = false;
  };

  // Ejecuta una acción async contra el backend, gestionando `submitting` y
  // los errores (a UiStore). Devuelve true si salió bien.
  async run(action, failMessage) {
    this.submitting.value = true;
    UiStore.clear();
    try {
      await action();
      return true;
    } catch (error) {
      UiStore.fail(backendError(error, failMessage));
      return false;
    } finally {
      this.submitting.value = false;
    }
  }
}
