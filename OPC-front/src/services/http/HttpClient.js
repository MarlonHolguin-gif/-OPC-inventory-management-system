import axios from 'axios';
import { AuthStore } from '@/stores/AuthStore';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

/**
 * Cliente HTTP de la aplicación. Envuelve una instancia de axios con:
 *  - inyección del access token en cada request (leído del AuthStore),
 *  - renovación automática del token ante un 401 (una sola vez por request),
 *  - cierre de sesión + redirección al login si la renovación falla.
 *
 * Se expone como clase con métodos estáticos para que la capa de servicios
 * dependa de un tipo y no de una instancia suelta.
 */
export class HttpClient {
  // Instancia privada: nadie fuera de esta clase debería tocar axios directo.
  static #axios = HttpClient.#createInstance();

  // Varias peticiones pueden fallar con 401 casi al mismo tiempo (ej. varias
  // llamadas en paralelo al cargar una página) — el refresh token es de un
  // solo uso (se rota en el backend), así que esta promesa compartida hace
  // que todas esperen el mismo canje en vez de disparar el suyo.
  static #refreshPromise = null;

  static get(url, config) {
    return HttpClient.#axios.get(url, config);
  }

  static post(url, data, config) {
    return HttpClient.#axios.post(url, data, config);
  }

  static put(url, data, config) {
    return HttpClient.#axios.put(url, data, config);
  }

  static patch(url, data, config) {
    return HttpClient.#axios.patch(url, data, config);
  }

  static delete(url, config) {
    return HttpClient.#axios.delete(url, config);
  }

  static #createInstance() {
    const instance = axios.create({ baseURL });

    instance.interceptors.request.use((config) => {
      const token = AuthStore.accessToken.value;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    instance.interceptors.response.use(
      (response) => response,
      (error) => HttpClient.#onResponseError(instance, error),
    );

    return instance;
  }

  static async #onResponseError(instance, error) {
    const { config, response } = error;
    const isAuthEndpoint =
      config?.url?.includes('/api/auth/login') || config?.url?.includes('/api/auth/refresh');

    if (response?.status === 401 && config && !config._retry && !isAuthEndpoint) {
      const refreshToken = AuthStore.refreshToken.value;
      if (!refreshToken) {
        AuthStore.clearAndRedirect();
        return Promise.reject(error);
      }

      config._retry = true;

      try {
        if (!HttpClient.#refreshPromise) {
          // axios "pelado" (no la instancia) para no volver a pasar por este
          // mismo interceptor con la petición de refresh.
          HttpClient.#refreshPromise = axios
            .post(`${baseURL}/api/auth/refresh`, { refreshToken })
            .finally(() => {
              HttpClient.#refreshPromise = null;
            });
        }

        const { data } = await HttpClient.#refreshPromise;
        AuthStore.setTokens(data.token, data.refreshToken);
        config.headers.Authorization = `Bearer ${data.token}`;
        return instance(config);
      } catch (refreshError) {
        AuthStore.clearAndRedirect();
        return Promise.reject(refreshError);
      }
    }

    if (response?.status === 401) {
      AuthStore.clearAndRedirect();
    }

    return Promise.reject(error);
  }
}
