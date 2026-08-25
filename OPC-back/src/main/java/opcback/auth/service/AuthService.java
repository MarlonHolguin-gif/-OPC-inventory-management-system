package opcback.auth.service;

import lombok.RequiredArgsConstructor;
import opcback.auth.dto.LoginRequest;
import opcback.auth.dto.LoginResponse;
import opcback.auth.entity.User;
import opcback.auth.repository.UserRepository;
import opcback.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException("Credenciales inválidas"));

        String role = user.getRole().getCode();
        String token = jwtService.generateToken(user.getId(), user.getEmail(), role);

        return new LoginResponse(token, "Bearer", user.getId(), user.getName(), user.getEmail(), role);
    }
}
