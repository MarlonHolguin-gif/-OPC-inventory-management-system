import { DataTable } from '@/components/DataTable';
import { FormPanel } from '@/components/FormPanel';
import { Modal } from '@/components/Modal';
import { FilterBar, FilterField } from '@/components/FilterBar';
import { TextField, SelectField } from '@/components/Field';

const COLUMNS = [
  { key: 'name', header: 'Nombre' },
  { key: 'abbreviation', header: 'Abreviatura' },
  { key: 'active', header: 'Estado', render: (unit) => (unit.active ? 'Activa' : 'Inactiva') },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activa' },
  { value: 'inactive', label: 'Inactiva' },
];

export function UnitsTab({ controller }) {
  const form = controller.unitForm;
  const values = form.form.value;
  const filter = controller.unitFilter;
  const draft = filter.draft.value;

  return (
    <div className="catalog-panel">
      <FilterBar onSubmit={filter.apply}>
        <FilterField>
          <TextField
            label="Nombre"
            value={draft.name}
            onChange={(value) => filter.set('name', value)}
            placeholder="Filtra los resultados"
          />
        </FilterField>
        <FilterField>
          <SelectField
            label="Estado"
            value={draft.status}
            onChange={(value) => filter.set('status', value)}
            options={STATUS_OPTIONS}
            placeholder="Todos"
          />
        </FilterField>
        <FilterBar.Actions>
          <button type="submit">Filtrar</button>
          <button type="button" onClick={filter.clear}>
            Limpiar filtros
          </button>
        </FilterBar.Actions>
        <button type="button" className="button-link primary filter-bar-cta" onClick={form.openCreate}>
          + Nueva unidad de medida
        </button>
      </FilterBar>

      <div className="catalog-table-card">
        <DataTable
          columns={COLUMNS}
          rows={controller.filteredUnits.value}
          empty="No hay unidades de medida que coincidan con los filtros"
          actions={(unit) => (
            <>
              <button type="button" onClick={() => form.startEdit(unit)}>
                Editar
              </button>
              {unit.active ? (
                <button type="button" onClick={() => form.deactivate(unit.id)}>
                  Desactivar
                </button>
              ) : (
                <button type="button" onClick={() => form.reactivate(unit.id)}>
                  Reactivar
                </button>
              )}
              <button type="button" onClick={() => form.remove(unit)}>
                Eliminar
              </button>
            </>
          )}
        />
      </div>

      {form.visible.value && (
        <Modal
          title={form.isEditing ? 'Editar unidad' : 'Nueva unidad de medida'}
          onClose={form.close}
        >
          <FormPanel
            submitLabel={form.isEditing ? 'Guardar cambios' : 'Crear unidad'}
            submitting={form.submitting.value}
            onSubmit={(event) => form.submit(event)}
            onCancel={form.close}
            error={form.error.value}
          >
            <TextField
              label="Nombre"
              value={values.name}
              onChange={(value) => form.setField('name', value)}
              required
            />
            <TextField
              label="Abreviatura"
              value={values.abbreviation}
              onChange={(value) => form.setField('abbreviation', value)}
              required
            />
          </FormPanel>
        </Modal>
      )}
    </div>
  );
}
