package opcback.auth.service;

import lombok.RequiredArgsConstructor;
import opcback.auth.dto.LoginRequest;
import opcback.auth.dto.LoginResponse;
import opcback.auth.dto.MeResponse;
import opcback.auth.entity.User;
import opcback.auth.repository.UserBranchRepository;
import opcback.auth.repository.UserRepository;
import opcback.exception.ResourceNotFoundException;
import opcback.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String GENERAL_ADMIN_ROLE = "GENERAL_ADMIN";

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final UserBranchRepository userBranchRepository;
    private final JwtService jwtService;

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException("Credenciales inválidas"));

        String role = user.getRole().getCode();
        String token = jwtService.generateToken(user.getId(), user.getEmail(), role);

        return new LoginResponse(token, "Bearer", user.getId(), user.getName(), user.getEmail(), role,
                resolveBranches(user, role));
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

    private Object resolveBranches(User user, String role) {
        return GENERAL_ADMIN_ROLE.equals(role)
                ? "todas"
                : userBranchRepository.findBranchIdsByUserId(user.getId());
    }
}
