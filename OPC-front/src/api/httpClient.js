import axios from 'axios';

export const ACCESS_TOKEN_KEY = 'opc_access_token';
export const REFRESH_TOKEN_KEY = 'opc_refresh_token';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

const httpClient = axios.create({ baseURL });

// Adjunta el access token a toda petición saliente, si existe.
httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function clearSessionAndRedirect() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

// Varias peticiones pueden fallar con 401 casi al mismo tiempo (ej. varias
// llamadas en paralelo al cargar una página) — el refresh token es de un
// solo uso (se rota en el backend), así que si cada una intentara refrescar
// por su cuenta, solo la primera tendría éxito y las demás fallarían con
// "refresh token inválido". Esta promesa compartida hace que todas esperen
// el mismo canje en vez de disparar el suyo.
let refreshPromise = null;

// Si el backend responde 401, el access token ya no sirve (expiró o es
// inválido). Antes de rendirse y mandar al login, se intenta renovarlo con
// el refresh token — solo si la petición que falló no era ya un intento de
// login/refresh (evita un loop infinito) y no se había reintentado ya.
httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isAuthEndpoint = config?.url?.includes('/api/auth/login') || config?.url?.includes('/api/auth/refresh');

    if (response?.status === 401 && config && !config._retry && !isAuthEndpoint) {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        clearSessionAndRedirect();
        return Promise.reject(error);
      }

      config._retry = true;

      try {
        if (!refreshPromise) {
          // axios "pelado" (no httpClient) para no volver a pasar por este
          // mismo interceptor con la petición de refresh.
          refreshPromise = axios
            .post(`${baseURL}/api/auth/refresh`, { refreshToken })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const { data } = await refreshPromise;
        localStorage.setItem(ACCESS_TOKEN_KEY, data.token);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);

        config.headers.Authorization = `Bearer ${data.token}`;
        return httpClient(config);
      } catch (refreshError) {
        clearSessionAndRedirect();
        return Promise.reject(refreshError);
      }
    }

    if (response?.status === 401) {
      clearSessionAndRedirect();
    }

    return Promise.reject(error);
  },
);

export default httpClient;
