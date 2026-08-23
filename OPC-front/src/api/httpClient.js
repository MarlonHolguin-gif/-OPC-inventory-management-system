import axios from 'axios';

export const ACCESS_TOKEN_KEY = 'opc_access_token';

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
});

// Adjunta el access token a toda petición saliente, si existe.
httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el backend responde 401, el access token ya no sirve (expiró o es
// inválido). Por ahora se limpia la sesión y se manda al login.
//
// Cuando exista el endpoint de refresh (épica de Autenticación), este es el
// lugar para intentar renovar el access token con el refresh token antes de
// desloguear, y solo redirigir a /login si el refresh también falla.
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default httpClient;
