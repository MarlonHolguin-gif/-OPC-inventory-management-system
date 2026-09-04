import { useController } from '@/lib/useController';
import { useRedirect } from '@/lib/useRedirect';
import { ThemeStore } from '@/stores/ThemeStore';
import { TextField } from '@/components/Field';
import { PasswordField } from '@/components/PasswordField';
import { BrandMark } from '@/components/BrandMark';
import { SunIcon, MoonIcon } from '@/components/icons/UtilityIcons';
import { CircuitField } from '@/components/CircuitField';
import { LoginController } from './LoginController';
import './LoginPage.css';

export default function LoginPage() {
  const controller = useController(LoginController);
  useRedirect(controller.redirect);

  const theme = ThemeStore.theme.value;

  return (
    <main className="login-screen">
      <CircuitField />

      <button
        type="button"
        onClick={ThemeStore.toggle}
        className="icon-button login-theme-toggle"
        aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>

      <div className="login-card">
        <h1 className="login-title">
          <BrandMark size={52} />
        </h1>
        <p className="login-subtitle">Sistema de inventario multi-sucursal</p>

        <form onSubmit={(event) => controller.submit(event)} className="login-form" noValidate>
          <TextField
            label="Correo"
            type="email"
            value={controller.email.value}
            onChange={controller.setEmail}
            required
          />

          <PasswordField
            label="Contraseña"
            value={controller.password.value}
            onChange={controller.setPassword}
            required
          />

          {controller.error.value && <p role="alert">{controller.error.value}</p>}

          <button type="submit" disabled={controller.submitting.value}>
            {controller.submitting.value ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  );
}
