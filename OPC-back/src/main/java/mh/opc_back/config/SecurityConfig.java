package mh.opc_back.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;

/**
 * Configuración mínima de autorización. Usa un bean Customizer<HttpSecurity>
 * (patrón recomendado en Spring Boot 4) en vez de un SecurityFilterChain
 * completo, para conservar los defaults de Spring Boot y tocar solo la regla
 * que necesitamos hoy: dejar /actuator/health público para health checks de
 * Docker/orquestadores. El resto de la autenticación/autorización (JWT,
 * roles por sucursal) se implementa en la épica de Autenticación.
 *
 * No se agrega aquí un .anyRequest().authenticated() propio: este mismo
 * Customizer se reutiliza tanto en la cadena de seguridad principal como en
 * la que Spring Boot 4 genera aparte para Actuator, y esa segunda cadena
 * intenta agregar su propio matcher después — lo cual falla si el registro
 * ya se cerró con anyRequest(). Los defaults de Spring Boot ya se encargan
 * de exigir autenticación en todo lo que no se libere explícitamente aquí.
 */
@Configuration
public class SecurityConfig {

    @Bean
    Customizer<HttpSecurity> customizeAuthorizeHttpRequests() {
        return http -> http.authorizeHttpRequests(requests -> requests
                .requestMatchers("/actuator/health").permitAll());
    }
}
