package opcback.auth.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import opcback.auth.dto.LoginRequest;
import opcback.auth.dto.LoginResponse;
import opcback.auth.dto.LogoutRequest;
import opcback.auth.dto.MeResponse;
import opcback.auth.dto.RefreshRequest;
import opcback.auth.dto.RefreshResponse;
import opcback.auth.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public MeResponse me(Authentication authentication) {
        return authService.me(authentication.getName());
    }

    /**
     * Público (ver SecurityConfig): se llama precisamente cuando el access
     * token ya expiró, así que exigirle uno válido no tendría sentido — la
     * seguridad la da el propio refresh token, de un solo uso.
     */
    @PostMapping("/refresh")
    public ResponseEntity<RefreshResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(authService.refresh(request.refreshToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody LogoutRequest request) {
        authService.logout(request.refreshToken());
        return ResponseEntity.noContent().build();
    }
}
