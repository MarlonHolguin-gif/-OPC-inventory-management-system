import { FormController } from '@/lib/FormController';
import { BranchDirectoryStore } from '@/stores/BranchDirectoryStore';
import { BranchService } from '../services/BranchService';

const EMPTY = { code: '', name: '', address: '', city: '', phone: '' };

export class BranchFormController extends FormController {
  constructor(parent) {
    super(EMPTY);
    this.parent = parent;
  }

  startEdit(branch) {
    this.openEdit(branch.id, {
      code: branch.code,
      name: branch.name,
      address: branch.address ?? '',
      city: branch.city ?? '',
      phone: branch.phone ?? '',
    });
  }

  async submit(event) {
    event.preventDefault();
    const { code, name, address, city, phone } = this.form.value;
    const payload = { name, address: address || null, city: city || null, phone: phone || null };

    const ok = await this.run(
      () =>
        this.isEditing
          ? BranchService.update(this.editingId.value, payload)
          : BranchService.create({ ...payload, code }),
      'No se pudo guardar la sucursal.',
    );

    if (ok) {
      this.close();
      // el directorio global de sucursales quedó obsoleto
      BranchDirectoryStore.reset();
      await this.parent.load();
    }
  }
}
