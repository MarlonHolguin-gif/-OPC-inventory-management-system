// Decodifica el payload de un JWT sin verificar la firma — solo para leer
// claims (role, userId) y adaptar la UI. La validación real del token
// siempre ocurre en el backend en cada request; esto nunca es una fuente
// de autorización, solo de presentación.
export function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}
