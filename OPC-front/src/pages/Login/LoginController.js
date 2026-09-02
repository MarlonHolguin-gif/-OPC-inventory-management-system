import { signal } from '@preact/signals-react';
import { Controller } from '@/lib/Controller';
import { AuthStore } from '@/stores/AuthStore';
import { AuthService } from '@/services/AuthService';
import { homePathFor } from '@/app/routes';

export class LoginController extends Controller {
  email = signal('');
  password = signal('');
  error = signal(null);
  submitting = signal(false);
  redirect = signal(null);

  setEmail = (value) => {
    this.email.value = value;
  };

  setPassword = (value) => {
    this.password.value = value;
  };

  async submit(event) {
    event.preventDefault();
    this.error.value = null;
    this.submitting.value = true;
    try {
      const data = await AuthService.login(this.email.value, this.password.value);
      await AuthStore.login(data.token, data.refreshToken);
      this.redirect.value = { path: homePathFor(AuthStore.role.value), options: { replace: true } };
    } catch {
      this.error.value = 'No se pudo iniciar sesión. Verifica tus credenciales.';
    } finally {
      this.submitting.value = false;
    }
  }
}
