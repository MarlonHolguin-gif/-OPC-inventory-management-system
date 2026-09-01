import { signal } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { UiStore } from '@/stores/UiStore';
import { SaleService } from '../services/SaleService';

/**
 * Comprobante de una venta: encabezado (número, fecha, sucursal, responsable,
 * cliente, lista de precios), ítems y totales. Solo lectura.
 */
export class SaleDetailController extends Controller {
  constructor(saleId) {
    super();
    this.saleId = saleId;
  }

  sale = signal(null);

  onMount() {
    return this.load();
  }

  async load() {
    try {
      const [sale] = await Promise.all([
        SaleService.get(this.saleId),
        BranchDirectoryStore.ensureLoaded(),
      ]);
      this.sale.value = sale;
    } catch {
      UiStore.fail('No se pudo cargar el comprobante de la venta.');
    }
  }

  branchName(id) {
    return BranchDirectoryStore.nameOf(id) ?? `Sucursal ${id}`;
  }
}
