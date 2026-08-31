package opcback.system.alerts.controller;

import lombok.RequiredArgsConstructor;
import opcback.system.alerts.dto.NotificationResponse;
import opcback.system.alerts.service.NotificationService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Autorización por sucursal (no por rol) resuelta dentro de
 * NotificationService — mismo estilo que Transferencias/Compras/Ventas:
 * cualquier rol autenticado puede leer, filtrado a lo que le corresponde.
 */
@RestController
@RequestMapping("/api/notificaciones")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public List<NotificationResponse> list(
            @RequestParam(required = false) Long branchId, Authentication authentication) {
        return notificationService.list(authentication.getName(), branchId);
    }

    @PatchMapping("/{id}/leida")
    public NotificationResponse markAsRead(@PathVariable Long id, Authentication authentication) {
        return notificationService.markAsRead(id, authentication.getName());
    }
}
