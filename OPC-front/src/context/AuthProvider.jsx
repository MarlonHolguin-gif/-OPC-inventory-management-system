import { useEffect, useMemo, useState } from 'react';
import { decodeJwtPayload } from '../api/jwt';
import httpClient, { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../api/httpClient';
import AuthContext from './AuthContext';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(ACCESS_TOKEN_KEY));
  const [branches, setBranches] = useState(null);

  // El rol/email/userId salen del propio token (claims). "branches" NO va
  // en el JWT (puede cambiar sin re-loguearse), así que se refresca desde
  // /api/auth/me cada vez que hay un token nuevo (login o recarga de página).
  const claims = useMemo(() => (token ? decodeJwtPayload(token) : null), [token]);

  useEffect(() => {
    if (!token) return undefined;

    let cancelled = false;
    httpClient
      .get('/api/auth/me')
      .then(({ data }) => {
        if (!cancelled) setBranches(data.branches);
      })
      .catch(() => {
        if (!cancelled) setBranches(null);
      });

    return () => {
      cancelled = true;
      setBranches(null);
    };
  }, [token]);

  const login = (accessToken, refreshToken) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    setToken(accessToken);
  };

  const logout = () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      // Best-effort: si esta petición falla (ej. sin red), igual se cierra
      // la sesión localmente — pero sin esto, un refresh token robado
      // seguiría sirviendo hasta su expiración natural aunque el usuario
      // haya cerrado sesión.
      httpClient.post('/api/auth/logout', { refreshToken }).catch(() => {});
    }
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setToken(null);
  };

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      role: claims?.role ?? null,
      userId: claims?.userId ?? null,
      email: claims?.sub ?? null,
      branches,
      login,
      logout,
    }),
    [token, claims, branches],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
