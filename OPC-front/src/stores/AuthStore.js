import { signal, computed } from '@preact/signals-react';
import { decodeJwtPayload } from '@/services/http/Jwt';
import { AuthService } from '@/services/AuthService';

export const ACCESS_TOKEN_KEY = 'opc_access_token';
export const REFRESH_TOKEN_KEY = 'opc_refresh_token';

/**
 * Estado global de sesión. Reemplaza al antiguo AuthProvider/AuthContext.
 *
 * Los tokens son la fuente de verdad en memoria (signals) y se escriben en
 * localStorage para sobrevivir a recargas. El rol/email/userId se derivan
 * del propio JWT; `name` y `branches` NO viajan en el token, así que se
 * refrescan desde /api/auth/me (loadProfile).
 */
export class AuthStore {
  static accessToken = signal(localStorage.getItem(ACCESS_TOKEN_KEY));
  static refreshToken = signal(localStorage.getItem(REFRESH_TOKEN_KEY));
  static branches = signal(null);
  static name = signal(null);

  static claims = computed(() =>
    AuthStore.accessToken.value ? decodeJwtPayload(AuthStore.accessToken.value) : null,
  );

  static isAuthenticated = computed(() => Boolean(AuthStore.accessToken.value));
  static role = computed(() => AuthStore.claims.value?.role ?? null);
  static userId = computed(() => AuthStore.claims.value?.userId ?? null);
  static email = computed(() => AuthStore.claims.value?.sub ?? null);

  static async login(accessToken, refreshToken) {
    AuthStore.setTokens(accessToken, refreshToken);
    await AuthStore.loadProfile();
  }

  static logout() {
    const refreshToken = AuthStore.refreshToken.value;
    if (refreshToken) {
      // Best-effort: si esta petición falla (ej. sin red), igual se cierra
      // la sesión localmente — pero sin esto, un refresh token robado
      // seguiría sirviendo hasta su expiración natural.
      AuthService.logout(refreshToken).catch(() => {});
    }
    AuthStore.setTokens(null, null);
    AuthStore.#clearProfile();
  }

  static async loadProfile() {
    if (!AuthStore.accessToken.value) {
      AuthStore.#clearProfile();
      return;
    }
    try {
      const me = await AuthService.me();
      AuthStore.branches.value = me.branches;
      AuthStore.name.value = me.name;
    } catch {
      AuthStore.#clearProfile();
    }
  }

  static #clearProfile() {
    AuthStore.branches.value = null;
    AuthStore.name.value = null;
  }

  // Usado por el HttpClient tras renovar el token.
  static setTokens(accessToken, refreshToken) {
    AuthStore.accessToken.value = accessToken;
    AuthStore.refreshToken.value = refreshToken;
    AuthStore.#persist(ACCESS_TOKEN_KEY, accessToken);
    AuthStore.#persist(REFRESH_TOKEN_KEY, refreshToken);
  }

  // Usado por el HttpClient cuando la renovación falla: no hay sesión
  // recuperable, se limpia y se manda al login.
  static clearAndRedirect() {
    AuthStore.setTokens(null, null);
    AuthStore.#clearProfile();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  static #persist(key, value) {
    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  }
}
