package opcback.security;

import lombok.RequiredArgsConstructor;
import opcback.auth.entity.User;
import opcback.auth.repository.UserBranchRepository;
import opcback.auth.repository.UserRepository;
import opcback.exception.ResourceNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Componente central de autorización por sucursal, pensado para que lo
 * reutilice cualquier módulo que escriba datos transaccionales (inventario,
 * compras, ventas, transferencias).
 *
 * Lectura: no hay restricción aquí — cualquier rol autenticado puede
 * consultar el inventario de cualquier sucursal (sección 2.1 del PDF), así
 * que los módulos de solo lectura no necesitan llamar a este servicio.
 *
 * Escritura: GENERAL_ADMIN puede escribir en cualquier sucursal (acceso
 * implícito por rol); el resto solo en las sucursales que tenga asignadas
 * en ma_user_branch — si no tiene ninguna, no puede escribir en ninguna,
 * sin necesidad de un caso especial.
 */
@Service
@RequiredArgsConstructor
public class BranchAccessService {

    private static final String GENERAL_ADMIN_ROLE = "GENERAL_ADMIN";

    private final UserRepository userRepository;
    private final UserBranchRepository userBranchRepository;

    @Transactional(readOnly = true)
    public boolean canWrite(String email, Long branchId) {
        User user = findUserOrThrow(email);
        if (isGeneralAdmin(user)) {
            return true;
        }
        return userBranchRepository.findBranchIdsByUserId(user.getId()).contains(branchId);
    }

    /**
     * Lanza AccessDeniedException (403, vía GlobalExceptionHandler) si el
     * usuario no puede escribir en la sucursal indicada.
     *
     * @Transactional aquí también (no solo en canWrite): esta llamada
     * a this.canWrite(...) es auto-invocación, no pasa por el proxy de
     * Spring, así que el @Transactional de canWrite se ignoraría si esta
     * capa externa no abriera ya su propia transacción.
     */
    @Transactional(readOnly = true)
    public void assertCanWrite(String email, Long branchId) {
        if (!canWrite(email, branchId)) {
            throw new AccessDeniedException("No tiene acceso de escritura a la sucursal " + branchId);
        }
    }

    @Transactional(readOnly = true)
    public List<Long> getWritableBranchIds(String email) {
        return userBranchRepository.findBranchIdsByUserId(findUserOrThrow(email).getId());
    }

    /**
     * Expone el chequeo de rol que ya usaba internamente canWrite() — lo
     * necesita, por ejemplo, el listado de notificaciones (Notificaciones:
     * "todas si es ADMIN_GENERAL, si no solo las de sus sucursales
     * asignadas"), que es una regla de LECTURA y no encaja en el resto de
     * esta clase, pero reutiliza el mismo criterio en vez de duplicarlo.
     */
    @Transactional(readOnly = true)
    public boolean isGeneralAdmin(String email) {
        return isGeneralAdmin(findUserOrThrow(email));
    }

    private User findUserOrThrow(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado: " + email));
    }

    private boolean isGeneralAdmin(User user) {
        return GENERAL_ADMIN_ROLE.equals(user.getRole().getCode());
    }
}
