import { HttpClient } from '@/services/http/HttpClient';

/**
 * Llamadas al backend de autenticación. No guarda estado — de eso se
 * encarga el AuthStore.
 */
export class AuthService {
  static login(email, password) {
    return HttpClient.post('/api/auth/login', { email, password }).then((r) => r.data);
  }

  static me() {
    return HttpClient.get('/api/auth/me').then((r) => r.data);
  }

  static logout(refreshToken) {
    return HttpClient.post('/api/auth/logout', { refreshToken });
  }
}
