package opcback.config;

import lombok.RequiredArgsConstructor;
import opcback.security.JwtAuthEntryPoint;
import opcback.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Cadena de seguridad única y explícita para toda la app (incluye
 * /actuator/**, que corre en el mismo puerto/contexto). Al definir nuestro
 * propio SecurityFilterChain, Spring Boot 4 deja de autogenerar sus propias
 * cadenas (la principal y la separada de Actuator) — evita el conflicto
 * "Can't configure requestMatchers after anyRequest" que sí ocurría con el
 * patrón anterior de Customizer<HttpSecurity> compartido entre ambas
 * cadenas autogeneradas, porque aquí solo existe una cadena y nosotros
 * decidimos cuándo cerrarla con anyRequest().authenticated().
 *
 * "/error" debe quedar público: cuando una ruta protegida no tiene
 * controller (404), Spring reenvía internamente a /error para construir
 * la respuesta de error — ese reenvío vuelve a pasar por esta misma
 * cadena de seguridad, y si no fuera público, un JwtAuthenticationFilter
 * que solo procesa la request original (OncePerRequestFilter no repite
 * el token en un forward) haría que ese segundo paso se evalúe como
 * anónimo y sobrescriba la respuesta real con un 401 de JwtAuthEntryPoint.
 */
@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthEntryPoint jwtAuthEntryPoint;

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(requests -> requests
                        .requestMatchers("/actuator/health", "/api/auth/login", "/error").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(ex -> ex.authenticationEntryPoint(jwtAuthEntryPoint))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}
