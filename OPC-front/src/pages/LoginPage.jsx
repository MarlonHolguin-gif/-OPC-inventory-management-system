import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import httpClient from '../api/httpClient';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { SunIcon, MoonIcon, EyeIcon, EyeOffIcon } from '../components/icons/UtilityIcons';
import './LoginPage.css';

// Contrato real: POST /api/auth/login { email, password } ->
// 200 { token, tokenType, userId, name, email, role, branches }
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await httpClient.post('/api/auth/login', { email, password });
      login(data.token, data.refreshToken);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('No se pudo iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-screen">
      <button
        type="button"
        onClick={toggleTheme}
        className="theme-toggle login-theme-toggle"
        aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>

      <div className="login-card">
        <div className="login-logo">OP</div>
        <h1 className="login-title">OptiPlant</h1>
        <p className="login-subtitle">Sistema de inventario multi-sucursal</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="email">Correo</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Contraseña</label>
          <div className="input-with-action">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              className="input-action"
              onClick={() => setShowPassword((current) => !current)}
              aria-pressed={showPassword}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          {error && <p role="alert">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </main>
  );
}
