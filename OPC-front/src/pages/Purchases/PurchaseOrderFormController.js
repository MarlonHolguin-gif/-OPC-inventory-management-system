import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { AuthStore } from '@/stores/AuthStore';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { UiStore } from '@/stores/UiStore';
import { toNumber, backendError } from '@/lib/format';
import { PurchaseService } from './services/PurchaseService';

const EMPTY_ITEM = { productId: '', quantity: '', unitPrice: '', discount: '' };

/** Formulario de nueva orden de compra (modal sobre el listado). */
export class PurchaseOrderFormController extends Controller {
  constructor(parent) {
    super();
    this.parent = parent;
  }

  suppliers = signal([]);
  products = signal([]);

  supplierId = signal('');
  branchId = signal('');
  paymentTerms = signal('');
  items = signal([{ ...EMPTY_ITEM }]);

  visible = signal(false);
  loading = signal(true);
  submitting = signal(false);
  #loaded = false;

  availableBranches = computed(() => {
    const own = AuthStore.branches.value;
    const all = BranchDirectoryStore.all.value;
    return Array.isArray(own) ? all.filter((branch) => own.includes(branch.id)) : all;
  });

  lineSubtotals = computed(() =>
    this.items.value.map(
      (item) => toNumber(item.quantity) * toNumber(item.unitPrice) - toNumber(item.discount),
    ),
  );

  totals = computed(() => {
    const items = this.items.value;
    const subtotal = items.reduce((sum, item) => sum + toNumber(item.quantity) * toNumber(item.unitPrice), 0);
    const totalDiscount = items.reduce((sum, item) => sum + toNumber(item.discount), 0);
    return { subtotal, totalDiscount, total: subtotal - totalDiscount };
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
      const [suppliers, products] = await Promise.all([
        PurchaseService.suppliers(),
        PurchaseService.productCatalog(),
      ]);
      this.suppliers.value = suppliers.filter((supplier) => supplier.active);
      this.products.value = products;
      this.supplierId.value = this.supplierId.value || this.suppliers.value[0]?.id || '';
      this.branchId.value = this.branchId.value || this.availableBranches.value[0]?.id || '';
    } catch {
      UiStore.fail('No se pudo cargar la información necesaria para la orden de compra.');
    } finally {
      this.loading.value = false;
    }
  }

  setSupplierId = (value) => {
    this.supplierId.value = value;
  };

  setBranchId = (value) => {
    this.branchId.value = value;
  };

  setPaymentTerms = (value) => {
    this.paymentTerms.value = value;
  };

  updateItem = (index, field, value) => {
    this.items.value = this.items.value.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    );
  };

  addItem = () => {
    this.items.value = [...this.items.value, { ...EMPTY_ITEM }];
  };

  removeItem = (index) => {
    this.items.value = this.items.value.filter((_, i) => i !== index);
  };

  async submit(event) {
    event.preventDefault();
    UiStore.clear();

    const valid = this.items.value.every(
      (item) => item.productId && toNumber(item.quantity) > 0 && toNumber(item.unitPrice) >= 0,
    );
    if (!valid) {
      UiStore.fail('Cada ítem necesita producto, cantidad positiva y precio unitario válido.');
      return;
    }

    this.submitting.value = true;
    try {
      const order = await PurchaseService.create({
        supplierId: Number(this.supplierId.value),
        branchId: Number(this.branchId.value),
        paymentTerms: this.paymentTerms.value || null,
        items: this.items.value.map((item) => ({
          productId: Number(item.productId),
          quantity: toNumber(item.quantity),
          unitPrice: toNumber(item.unitPrice),
          discount: toNumber(item.discount),
        })),
      });
      UiStore.notify(`Orden de compra ${order.orderNumber ?? ''} creada correctamente.`.trim());
      this.items.value = [{ ...EMPTY_ITEM }];
      this.paymentTerms.value = '';
      this.close();
      await this.parent.load();
    } catch (error) {
      UiStore.fail(backendError(error, 'No se pudo crear la orden de compra.'));
    } finally {
      this.submitting.value = false;
    }
  }
}
