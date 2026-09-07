import { DataTable } from '@/components/DataTable';
import { FormPanel } from '@/components/FormPanel';
import { Modal } from '@/components/Modal';
import { FilterBar, FilterField } from '@/components/FilterBar';
import { TextField, SelectField } from '@/components/Field';

const COLUMNS = [
  { key: 'name', header: 'Nombre' },
  { key: 'description', header: 'Descripción' },
  { key: 'active', header: 'Estado', render: (row) => (row.active ? 'Activa' : 'Inactiva') },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activa' },
  { value: 'inactive', label: 'Inactiva' },
];

export function CategoriesTab({ controller }) {
  const form = controller.categoryForm;
  const values = form.form.value;
  const filter = controller.categoryFilter;
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
          + Nueva categoría
        </button>
      </FilterBar>

      <div className="catalog-table-card">
        <DataTable
          columns={COLUMNS}
          rows={controller.filteredCategories.value}
          empty="No hay categorías que coincidan con los filtros"
          actions={(category) => (
            <>
              <button type="button" onClick={() => form.startEdit(category)}>
                Editar
              </button>
              {category.active ? (
                <button
                  type="button"
                  className="button-danger"
                  onClick={() => form.deactivate(category.id)}
                >
                  Desactivar
                </button>
              ) : (
                <button type="button" onClick={() => form.reactivate(category.id)}>
                  Reactivar
                </button>
              )}
              <button
                type="button"
                className="button-danger"
                onClick={() => form.remove(category)}
              >
                Eliminar
              </button>
            </>
          )}
        />
      </div>

      {form.visible.value && (
        <Modal title={form.isEditing ? 'Editar categoría' : 'Nueva categoría'} onClose={form.close}>
          <FormPanel
            submitLabel={form.isEditing ? 'Guardar cambios' : 'Crear categoría'}
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
              label="Descripción"
              value={values.description}
              onChange={(value) => form.setField('description', value)}
            />
          </FormPanel>
        </Modal>
      )}
    </div>
  );
}
