import { signal, computed } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { UiStore } from '@/stores/UiStore';
import { AuditService } from './services/AuditService';

const PAGE_SIZE = 20;
const EMPTY_FILTERS = { entity: '', entityId: '', userId: '', from: '', to: '' };

/**
 * Vista de consulta de auditoría (solo ADMIN_GENERAL). Filtros +
 * paginación server-side + detalle del diff antes/después por evento.
 */
export class AuditController extends Controller {
  rows = signal([]);
  pageInfo = signal({ number: 0, totalPages: 0, totalElements: 0, first: true, last: true });
  filters = signal({ ...EMPTY_FILTERS });
  users = signal([]);
  loading = signal(true);
  searching = signal(false);
  expandedId = signal(null);

  userNames = computed(() =>
    Object.fromEntries(this.users.value.map((user) => [user.id, user.name])),
  );

  userName(id) {
    if (id == null) return '—';
    return this.userNames.value[id] ?? `#${id}`;
  }

  async onMount() {
    try {
      this.users.value = await AuditService.users();
    } catch {
      // el filtro por responsable queda sin nombres, no es bloqueante
    }
    await this.fetch(0);
    this.loading.value = false;
  }

  setFilter = (key, value) => {
    this.filters.value = { ...this.filters.value, [key]: value };
  };

  clearFilters = () => {
    this.filters.value = { ...EMPTY_FILTERS };
  };

  applyFilters = (event) => {
    event?.preventDefault();
    return this.fetch(0);
  };

  goToPage = (pageNumber) => this.fetch(pageNumber);

  toggleExpanded = (id) => {
    this.expandedId.value = this.expandedId.value === id ? null : id;
  };

  #buildParams(pageNumber) {
    const f = this.filters.value;
    const params = { page: pageNumber, size: PAGE_SIZE };
    if (f.entity) params.entity = f.entity;
    if (f.entityId) params.entityId = f.entityId;
    if (f.userId) params.userId = f.userId;
    if (f.from) params.from = `${f.from}T00:00:00`;
    if (f.to) params.to = `${f.to}T23:59:59`;
    return params;
  }

  async fetch(pageNumber) {
    this.searching.value = true;
    UiStore.clear();
    try {
      const page = await AuditService.search(this.#buildParams(pageNumber));
      this.rows.value = page.content ?? [];
      this.pageInfo.value = {
        number: page.number ?? 0,
        totalPages: page.totalPages ?? 0,
        totalElements: page.totalElements ?? 0,
        first: page.first ?? true,
        last: page.last ?? true,
      };
      this.expandedId.value = null;
    } catch {
      UiStore.fail('No se pudo consultar el registro de auditoría.');
    } finally {
      this.searching.value = false;
    }
  }
}
