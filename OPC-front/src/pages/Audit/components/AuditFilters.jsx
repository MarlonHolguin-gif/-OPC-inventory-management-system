import { SelectField, TextField } from '@/components/Field';
import { FilterBar, FilterField } from '@/components/FilterBar';
import { DateRangeFilter } from '@/components/DateRangeFilter';

export function AuditFilters({ controller }) {
  const filters = controller.filters.value;
  const userOptions = controller.users.value.map((user) => ({ value: user.id, label: user.name }));

  return (
    <FilterBar onSubmit={controller.applyFilters}>
      <FilterField>
        <TextField
          label="Producto (ID)"
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
      <DateRangeFilter
        from={filters.from}
        to={filters.to}
        onFromChange={(value) => controller.setFilter('from', value)}
        onToChange={(value) => controller.setFilter('to', value)}
      />

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
