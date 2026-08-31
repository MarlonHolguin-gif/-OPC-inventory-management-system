import { SelectField, TextField } from '@/components/Field';
import { FilterBar, FilterField } from '@/components/FilterBar';
import { AUDITED_ENTITIES } from '../constants';

const ENTITY_OPTIONS = AUDITED_ENTITIES.map((entity) => ({ value: entity.value, label: entity.label }));

export function AuditFilters({ controller }) {
  const filters = controller.filters.value;
  const userOptions = controller.users.value.map((user) => ({ value: user.id, label: user.name }));

  return (
    <FilterBar onSubmit={controller.applyFilters}>
      <FilterField>
        <SelectField
          label="Entidad"
          value={filters.entity}
          onChange={(value) => controller.setFilter('entity', value)}
          options={ENTITY_OPTIONS}
          placeholder="Todas"
        />
      </FilterField>
      <FilterField>
        <TextField
          label="ID de la entidad"
          type="number"
          value={filters.entityId}
          onChange={(value) => controller.setFilter('entityId', value)}
          placeholder="Cualquiera"
        />
      </FilterField>
      <FilterField>
        <SelectField
          label="Responsable"
          value={filters.userId}
          onChange={(value) => controller.setFilter('userId', value)}
          options={userOptions}
          placeholder="Todos"
        />
      </FilterField>
      <FilterField>
        <TextField
          label="Desde"
          type="date"
          value={filters.from}
          onChange={(value) => controller.setFilter('from', value)}
        />
      </FilterField>
      <FilterField>
        <TextField
          label="Hasta"
          type="date"
          value={filters.to}
          onChange={(value) => controller.setFilter('to', value)}
        />
      </FilterField>

      <FilterBar.Actions>
        <button type="submit" disabled={controller.searching.value}>
          {controller.searching.value ? 'Consultando…' : 'Filtrar'}
        </button>
        <button type="button" onClick={controller.clearFilters}>
          Limpiar filtros
        </button>
      </FilterBar.Actions>
    </FilterBar>
  );
}
