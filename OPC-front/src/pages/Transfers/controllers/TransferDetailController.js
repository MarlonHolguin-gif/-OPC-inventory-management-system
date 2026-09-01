import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { AuthStore } from '@/stores/AuthStore';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { UiStore } from '@/stores/UiStore';
import { backendError } from '@/lib/format';
import { GENERAL_ADMIN } from '@/constants/roles';
import { TransferService } from '../services/TransferService';
import { timelineStepIndex } from '../constants';

const RECEIVED_STATUSES = ['FULLY_RECEIVED', 'PARTIALLY_RECEIVED'];

export class TransferDetailController extends Controller {
  constructor(transferId) {
    super();
    this.transferId = transferId;
  }

  transfer = signal(null);
  events = signal([]);
  prepareQuantities = signal({});
  receiveQuantities = signal({});
  carrier = signal('');
  estimatedArrivalDate = signal('');
  shortageResolution = signal('');
  shortageNotes = signal('');
  submitting = signal(false);
  loadError = signal(null);

  isAdmin = computed(() => AuthStore.role.value === GENERAL_ADMIN);
  isCancelled = computed(() => this.transfer.value?.status === 'CANCELLED');
  isTerminal = computed(() => RECEIVED_STATUSES.includes(this.transfer.value?.status));
  currentStep = computed(() => timelineStepIndex(this.transfer.value?.status ?? ''));

  // Paso 5: hay faltante (algún ítem con diferencia > 0) tras la recepción parcial.
  hasShortage = computed(() =>
    (this.transfer.value?.items ?? []).some((item) => Number(item.difference) > 0),
  );
  // Falta decidir el tratamiento del faltante.
  needsShortageResolution = computed(
    () =>
      this.transfer.value?.status === 'PARTIALLY_RECEIVED' &&
      this.hasShortage.value &&
      !this.transfer.value?.shortageResolution,
  );
  shortageResolved = computed(() => Boolean(this.transfer.value?.shortageResolution));

  canActOnOrigin = computed(() => this.#canWrite(this.transfer.value?.originBranchId));
  canActOnDestination = computed(() => this.#canWrite(this.transfer.value?.destinationBranchId));

  #canWrite(branchId) {
    if (branchId == null) return false;
    const own = AuthStore.branches.value;
    return this.isAdmin.value || (Array.isArray(own) && own.includes(branchId));
  }

  branchName(id) {
    return BranchDirectoryStore.nameOf(id) ?? id;
  }

  async onMount() {
    await Promise.all([this.load(), BranchDirectoryStore.ensureLoaded()]);
  }

  async load() {
    let transfer;
    let events;
    try {
      [transfer, events] = await Promise.all([
        TransferService.get(this.transferId),
        TransferService.events(this.transferId),
      ]);
    } catch (error) {
      // 403: la transferencia es de sucursales que no le competen al usuario.
      this.loadError.value =
        error?.response?.status === 403
          ? 'No tienes acceso a esta transferencia: no participa ninguna de tus sucursales.'
          : 'No se pudo cargar la transferencia.';
      return;
    }
    this.loadError.value = null;
    this.transfer.value = transfer;
    this.events.value = events;

    // Precarga: preparar sugiere enviar lo solicitado, recibir sugiere
    // recibir lo despachado — el usuario ajusta si hay diferencias.
    const prepare = {};
    const receive = {};
    transfer.items.forEach((item) => {
      prepare[item.id] = String(item.requestedQuantity);
      receive[item.id] = String(item.shippedQuantity ?? 0);
    });
    this.prepareQuantities.value = prepare;
    this.receiveQuantities.value = receive;
  }

  setPrepareQuantity = (itemId, value) => {
    this.prepareQuantities.value = { ...this.prepareQuantities.value, [itemId]: value };
  };

  setReceiveQuantity = (itemId, value) => {
    this.receiveQuantities.value = { ...this.receiveQuantities.value, [itemId]: value };
  };

  setCarrier = (value) => {
    this.carrier.value = value;
  };

  setEstimatedArrivalDate = (value) => {
    this.estimatedArrivalDate.value = value;
  };

  setShortageResolution = (value) => {
    this.shortageResolution.value = value;
  };

  setShortageNotes = (value) => {
    this.shortageNotes.value = value;
  };

  async #run(action, successMessage) {
    UiStore.clear();
    this.submitting.value = true;
    try {
      await action();
      await this.load();
      UiStore.notify(successMessage);
    } catch (error) {
      UiStore.fail(backendError(error, 'No se pudo completar la acción.'));
    } finally {
      this.submitting.value = false;
    }
  }

  prepare(event) {
    event.preventDefault();
    // 0 es válido (se agotó el stock en origen) — se manda el ítem completo.
    const items = this.transfer.value.items.map((item) => ({
      transferItemId: item.id,
      shippedQuantity: Number(this.prepareQuantities.value[item.id] ?? 0),
    }));
    return this.#run(
      () => TransferService.prepare(this.transferId, items),
      'Envío preparado correctamente.',
    );
  }

  dispatch(event) {
    event.preventDefault();
    if (!this.carrier.value.trim()) {
      UiStore.fail('Indica el transportista.');
      return undefined;
    }
    return this.#run(
      () =>
        TransferService.dispatch(this.transferId, {
          carrier: this.carrier.value.trim(),
          estimatedArrivalDate: this.estimatedArrivalDate.value || null,
        }),
      'Transferencia despachada correctamente.',
    );
  }

  receiveComplete(event) {
    event.preventDefault();
    return this.#run(
      () => TransferService.receiveComplete(this.transferId),
      'Recepción completa registrada.',
    );
  }

  receivePartial(event) {
    event.preventDefault();
    const items = this.transfer.value.items.map((item) => ({
      transferItemId: item.id,
      receivedQuantity: Number(this.receiveQuantities.value[item.id] ?? 0),
    }));
    return this.#run(
      () => TransferService.receivePartial(this.transferId, items),
      'Recepción parcial registrada.',
    );
  }

  // Paso 5 (cierre): registra el tratamiento del faltante. Si es reenvío,
  // el backend genera una transferencia de seguimiento.
  async resolveShortage(event) {
    event.preventDefault();
    if (!this.shortageResolution.value) {
      UiStore.fail('Elige el tratamiento del faltante.');
      return;
    }
    UiStore.clear();
    this.submitting.value = true;
    try {
      const updated = await TransferService.resolveShortage(this.transferId, {
        resolution: this.shortageResolution.value,
        notes: this.shortageNotes.value.trim() || null,
      });
      await this.load();
      this.shortageResolution.value = '';
      this.shortageNotes.value = '';
      UiStore.notify(
        updated.reshipmentTransferId
          ? 'Faltante tratado con reenvío. Se generó una transferencia de seguimiento.'
          : 'Tratamiento del faltante registrado.',
      );
    } catch (error) {
      UiStore.fail(backendError(error, 'No se pudo registrar el tratamiento del faltante.'));
    } finally {
      this.submitting.value = false;
    }
  }
}
