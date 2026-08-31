package opcback.auth.service;

import lombok.RequiredArgsConstructor;
import opcback.auth.dto.LoginRequest;
import opcback.auth.dto.LoginResponse;
import opcback.auth.dto.MeResponse;
import opcback.auth.dto.RefreshResponse;
import opcback.auth.entity.User;
import opcback.auth.repository.UserBranchRepository;
import opcback.auth.repository.UserRepository;
import opcback.exception.ResourceNotFoundException;
import opcback.security.JwtService;
import opcback.security.RefreshTokenService;
import opcback.system.audit.service.AuditLogService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String GENERAL_ADMIN_ROLE = "GENERAL_ADMIN";

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final UserBranchRepository userBranchRepository;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final AuditLogService auditLogService;

    /**
     * Registro de eventos de autenticación (AUDITORIA): se resuelve el
     * usuario ANTES de autenticar para poder registrar internamente, en un
     * intento fallido, si el email correspondía o no a una cuenta real —
     * sin que eso cambie en nada la respuesta HTTP, que sigue siendo el
     * mismo 401 genérico de GlobalExceptionHandler para cualquier causa
     * (email inexistente, contraseña incorrecta, cuenta desactivada). Ese
     * 401 genérico ya existía antes de esta tarjeta; aquí solo se agrega el
     * registro interno, nunca se cambia qué ve el cliente.
     */
    @Transactional
    public LoginResponse login(LoginRequest request) {
        Optional<User> maybeUser = userRepository.findByEmail(request.email());

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        } catch (AuthenticationException ex) {
            auditLogService.recordLoginFailure(request.email(), maybeUser.map(User::getId).orElse(null));
            throw ex;
        }

        User user = maybeUser.orElseThrow(() -> new BadCredentialsException("Credenciales inválidas"));

        String role = user.getRole().getCode();
        String token = jwtService.generateToken(user.getId(), user.getEmail(), role);
        String refreshToken = refreshTokenService.issue(user);

        auditLogService.recordLoginSuccess(user);

        return new LoginResponse(token, "Bearer", user.getId(), user.getName(), user.getEmail(), role,
                resolveBranches(user, role), refreshToken);
    }

    /**
     * "Quién soy" — el JWT solo lleva userId/role, no branches (pueden
     * cambiar sin necesidad de re-loguearse). El frontend lo llama al
     * cargar la app para no depender de que LoginResponse siga vigente
     * tras un refresh de página.
     */
    @Transactional(readOnly = true)
    public MeResponse me(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + email));

        String role = user.getRole().getCode();
        return new MeResponse(user.getId(), user.getName(), user.getEmail(), role, resolveBranches(user, role));
    }

    /**
     * Canjea un refresh token válido por un access token nuevo — y por un
     * refresh token de reemplazo (rotación de un solo uso, ver
     * RefreshTokenService). Este es el punto que el interceptor de axios
     * del frontend llama automáticamente cuando una petición recibe 401
     * por access token expirado, antes de rendirse y mandar al login.
     */
    @Transactional
    public RefreshResponse refresh(String rawRefreshToken) {
        User user = refreshTokenService.consume(rawRefreshToken);
        String role = user.getRole().getCode();

        String newAccessToken = jwtService.generateToken(user.getId(), user.getEmail(), role);
        String newRefreshToken = refreshTokenService.issue(user);

        return new RefreshResponse(newAccessToken, "Bearer", newRefreshToken);
    }

    /**
     * Revoca el refresh token en logout — sin esto, un refresh token
     * robado seguiría siendo válido hasta su expiración natural aunque el
     * usuario cierre sesión (la consecuencia de seguridad que quedó
     * anotada como pendiente en ADR-003).
     */
    @Transactional
    public void logout(String rawRefreshToken) {
        refreshTokenService.revoke(rawRefreshToken);
    }

    private Object resolveBranches(User user, String role) {
        return GENERAL_ADMIN_ROLE.equals(role)
                ? "todas"
                : userBranchRepository.findBranchIdsByUserId(user.getId());
    }
}
