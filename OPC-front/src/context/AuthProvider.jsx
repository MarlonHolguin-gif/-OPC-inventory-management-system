import { useMemo, useState } from 'react';
import { ACCESS_TOKEN_KEY } from '../api/httpClient';
import AuthContext from './AuthContext';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(ACCESS_TOKEN_KEY));

  const login = (accessToken) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    setToken(accessToken);
  };

  const logout = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    setToken(null);
  };

  const value = useMemo(
    () => ({ token, isAuthenticated: Boolean(token), login, logout }),
    [token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
