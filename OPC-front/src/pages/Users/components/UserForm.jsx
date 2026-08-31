import { FormPanel } from '@/components/FormPanel';
import { TextField, SelectField } from '@/components/Field';
import { PasswordField } from '@/components/PasswordField';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { ROLES } from '@/constants/roles';

const ROLE_OPTIONS = ROLES.map((role) => ({ value: role.code, label: role.name }));

export function UserForm({ controller }) {
  const form = controller.form;
  const values = form.form.value;

  const branchOptions = BranchDirectoryStore.all.value.map((branch) => ({
    value: branch.id,
    label: branch.name,
  }));

  return (
    <FormPanel
      submitLabel={form.isEditing ? 'Guardar cambios' : 'Crear usuario'}
      submitting={form.submitting.value}
      onSubmit={(event) => form.submit(event)}
      onCancel={form.close}
    >
      <TextField
        label="Nombre"
        value={values.name}
        onChange={(value) => form.setField('name', value)}
        required
      />
      <TextField
        label="Correo"
        type="email"
        value={values.email}
        onChange={(value) => form.setField('email', value)}
        required
      />

      {!form.isEditing && (
        <PasswordField
          label="Contraseña"
          minLength={8}
          value={values.password}
          onChange={(value) => form.setField('password', value)}
          required
        />
      )}

      <SelectField
        label="Rol"
        value={values.roleCode}
        onChange={form.setRole}
        options={ROLE_OPTIONS}
        placeholder={null}
      />

      {!form.isEditing && form.needsBranch.value && (
        <SelectField
          label="Sucursal a la que va a servir"
          value={values.branchId}
          onChange={(value) => form.setField('branchId', value)}
          options={branchOptions}
        />
      )}
    </FormPanel>
  );
}
