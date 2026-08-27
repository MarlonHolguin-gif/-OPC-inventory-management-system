package opcback.security;

import opcback.auth.entity.RefreshToken;
import opcback.auth.entity.User;
import opcback.auth.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;

/**
 * Emisión, validación y rotación de refresh tokens (tabla
 * sy_refresh_tokens) — ver ADR-003 en Decisiones_Arquitectura.md. El valor
 * crudo nunca se persiste, solo su hash SHA-256; y cada refresh token es de
 * un solo uso: consumirlo lo revoca y entrega uno nuevo (rotación), así que
 * reutilizar uno ya canjeado (ej. un token robado y luego usado por su
 * dueño legítimo) queda detectado como refresh token inválido.
 */
@Service
public class RefreshTokenService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final RefreshTokenRepository refreshTokenRepository;
    private final long refreshExpirationMs;

    public RefreshTokenService(
            RefreshTokenRepository refreshTokenRepository,
            @Value("${jwt.refresh-expiration}") long refreshExpirationMs) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.refreshExpirationMs = refreshExpirationMs;
    }

    @Transactional
    public String issue(User user) {
        String rawToken = generateRawToken();

        RefreshToken entity = new RefreshToken();
        entity.setUser(user);
        entity.setTokenHash(hash(rawToken));
        entity.setExpiresAt(LocalDateTime.now().plus(Duration.ofMillis(refreshExpirationMs)));
        entity.setRevoked(false);
        entity.setCreatedAt(LocalDateTime.now());

        refreshTokenRepository.save(entity);
        return rawToken;
    }

    /**
     * Valida el refresh token y lo revoca de inmediato (rotación) —
     * devuelve el usuario dueño para que quien llama emita el access token
     * nuevo y, con {@link #issue}, el refresh token de reemplazo.
     */
    @Transactional
    public User consume(String rawToken) {
        RefreshToken entity = refreshTokenRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new BadCredentialsException("Refresh token inválido"));

        if (entity.isRevoked() || entity.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadCredentialsException("Refresh token inválido o expirado");
        }

        entity.setRevoked(true);
        refreshTokenRepository.save(entity);
        return entity.getUser();
    }

    /**
     * Logout: revoca el refresh token para que no se pueda volver a
     * canjear. Silencioso si el token no existe o ya estaba revocado —
     * el resultado que le importa al usuario (quedar deslogueado) ya se
     * cumple del lado del frontend borrando sus tokens locales.
     */
    @Transactional
    public void revoke(String rawToken) {
        refreshTokenRepository.findByTokenHash(hash(rawToken))
                .ifPresent(entity -> {
                    entity.setRevoked(true);
                    refreshTokenRepository.save(entity);
                });
    }

    private String generateRawToken() {
        byte[] bytes = new byte[48];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Base64.getEncoder().encodeToString(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible en esta JVM", e);
        }
    }
}
