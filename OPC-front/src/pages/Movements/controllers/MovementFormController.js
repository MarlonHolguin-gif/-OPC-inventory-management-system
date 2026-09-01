import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { AuthStore } from '@/stores/AuthStore';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { UiStore } from '@/stores/UiStore';
import { backendError } from '@/lib/format';
import { MovementService } from '../services/MovementService';
import { MOVEMENT_TYPES } from '../constants';

/**
 * Formulario de registro de un movimiento manual (devolución / ajuste), en
 * modal sobre la página de Movimientos. Carga perezosa al abrir; tras un
 * registro exitoso cierra y le pide al controller padre que recargue el
 * historial.
 */
export class MovementFormController extends Controller {
  constructor(parent) {
    super();
    this.parent = parent;
  }

  products = signal([]);
  branchId = signal('');
  productId = signal('');
  movementType = signal(MOVEMENT_TYPES[0].value);
  quantity = signal('');
  reason = signal('');
  fieldErrors = signal({});

  visible = signal(false);
  loading = signal(true);
  submitting = signal(false);
  #loaded = false;

  availableBranches = computed(() => {
    const own = AuthStore.branches.value;
    const all = BranchDirectoryStore.all.value;
    return Array.isArray(own) ? all.filter((branch) => own.includes(branch.id)) : all;
  });

  open = () => {
    this.visible.value = true;
    if (!this.#loaded) {
      this.#loaded = true;
      this.#load();
    }
  };

  close = () => {
    this.visible.value = false;
  };

  async #load() {
    if (!AuthStore.branches.value) await AuthStore.loadProfile();
    await BranchDirectoryStore.ensureLoaded();
    try {
      this.products.value = await MovementService.productCatalog();
    } catch {
      UiStore.fail('No se pudo cargar el catálogo de productos.');
    }
    this.branchId.value = this.branchId.value || this.availableBranches.value[0]?.id || '';
    this.productId.value = this.productId.value || this.products.value[0]?.id || '';
    this.loading.value = false;
  }

  setBranchId = (value) => {
    this.branchId.value = value;
  };

  setProductId = (value) => {
    this.productId.value = value;
  };

  setMovementType = (value) => {
    this.movementType.value = value;
  };

  setQuantity = (value) => {
    this.quantity.value = value;
  };

  setReason = (value) => {
    this.reason.value = value;
  };

  #validate() {
    const errors = {};
    const parsed = Number(this.quantity.value);
    if (!this.quantity.value || Number.isNaN(parsed) || parsed <= 0) {
      errors.quantity = 'La cantidad debe ser un número positivo.';
    } else if (!Number.isInteger(parsed)) {
      errors.quantity = 'La cantidad debe ser un número entero (no se venden fracciones de unidad).';
    }
    if (!this.reason.value.trim()) {
      errors.reason = 'El motivo no puede estar vacío.';
    }
    return errors;
  }

  async submit(event) {
    event.preventDefault();
    UiStore.clear();

    const errors = this.#validate();
    this.fieldErrors.value = errors;
    if (Object.keys(errors).length > 0) return;

    this.submitting.value = true;
    try {
      await MovementService.create({
        branchId: Number(this.branchId.value),
        productId: Number(this.productId.value),
        movementType: this.movementType.value,
        quantity: Number(this.quantity.value),
        reason: this.reason.value.trim(),
      });
      UiStore.notify('Movimiento registrado correctamente.');
      this.quantity.value = '';
      this.reason.value = '';
      this.fieldErrors.value = {};
      this.close();
      await this.parent.refresh();
    } catch (error) {
      UiStore.fail(backendError(error, 'No se pudo registrar el movimiento.'));
    } finally {
      this.submitting.value = false;
    }
  }
}
