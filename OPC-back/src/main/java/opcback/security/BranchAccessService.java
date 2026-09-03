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
    private static final String BRANCH_MANAGER_ROLE = "BRANCH_MANAGER";

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
     * Escritura de nivel gestión: acciones que un operador de inventario NO
     * puede hacer aunque esté asignado a la sucursal — hoy, confirmar y
     * despachar transferencias, recibirlas y clasificar la ruta (el operador
     * solo puede solicitarlas y consultarlas). GENERAL_ADMIN en cualquier
     * sucursal; BRANCH_MANAGER solo en las suyas.
     */
    @Transactional(readOnly = true)
    public boolean canManage(String email, Long branchId) {
        User user = findUserOrThrow(email);
        if (isGeneralAdmin(user)) {
            return true;
        }
        return BRANCH_MANAGER_ROLE.equals(user.getRole().getCode())
                && userBranchRepository.findBranchIdsByUserId(user.getId()).contains(branchId);
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

    /**
     * Lanza AccessDeniedException (403) si el usuario no tiene nivel de
     * gestión sobre la sucursal — ver {@link #canManage}.
     */
    @Transactional(readOnly = true)
    public void assertCanManage(String email, Long branchId) {
        if (!canManage(email, branchId)) {
            throw new AccessDeniedException(
                    "Esta acción sobre la sucursal " + branchId
                            + " es solo para el gerente de la sucursal o el administrador general");
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
