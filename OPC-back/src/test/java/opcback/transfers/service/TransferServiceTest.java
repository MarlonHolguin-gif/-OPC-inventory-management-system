package opcback.transfers.service;

import opcback.auth.entity.User;
import opcback.auth.repository.UserRepository;
import opcback.inventory.entity.Inventory;
import opcback.inventory.repository.InventoryRepository;
import opcback.inventory.service.InventoryMovementService;
import opcback.products.entity.Product;
import opcback.products.repository.ProductRepository;
import opcback.security.BranchAccessService;
import opcback.system.alerts.service.NotificationService;
import opcback.transfers.dto.TransferCreateRequest;
import opcback.transfers.dto.TransferDispatchRequest;
import opcback.transfers.dto.TransferItemRequest;
import opcback.transfers.dto.TransferPrepareRequest;
import opcback.transfers.dto.PrepareItemRequest;
import opcback.transfers.dto.TransferResponse;
import opcback.transfers.dto.TransferRoutePriorityRequest;
import opcback.transfers.dto.TransferShortageResolutionRequest;
import opcback.transfers.entity.ShortageResolution;
import opcback.transfers.entity.Transfer;
import opcback.transfers.entity.TransferItem;
import opcback.transfers.entity.TransferRoutePriority;
import opcback.transfers.entity.TransferStatus;
import opcback.transfers.entity.TransferUrgency;
import opcback.transfers.repository.TransferEventRepository;
import opcback.transfers.repository.TransferRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Paso 5 (cierre) del flujo de transferencias: tratamiento del faltante de
 * una recepción parcial. Cubre el ajuste/reclamación (solo registra la
 * decisión) y el reenvío (además genera la transferencia de seguimiento).
 */
@ExtendWith(MockitoExtension.class)
class TransferServiceTest {

    private static final Long TRANSFER_ID = 100L;
    private static final Long ORIGIN_BRANCH = 1L;
    private static final Long DESTINATION_BRANCH = 2L;
    private static final String EMAIL = "operador.medellin@opc.com";

    @Mock
    private TransferRepository transferRepository;
    @Mock
    private TransferEventRepository transferEventRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private InventoryRepository inventoryRepository;
    @Mock
    private BranchAccessService branchAccessService;
    @Mock
    private InventoryMovementService inventoryMovementService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private Authentication authentication;

    private TransferService transferService;
    private Transfer transfer;
    private TransferItem shortItem;

    @BeforeEach
    void setUp() {
        transferService = new TransferService(transferRepository, transferEventRepository, productRepository,
                userRepository, inventoryRepository, branchAccessService, inventoryMovementService, notificationService);

        Product product = new Product();
        product.setId(10L);
        product.setName("Leche Entera 1L");

        transfer = new Transfer();
        transfer.setId(TRANSFER_ID);
        transfer.setTransferNumber("TRF-2026-000001");
        transfer.setOriginBranchId(ORIGIN_BRANCH);
        transfer.setDestinationBranchId(DESTINATION_BRANCH);
        transfer.setStatus(TransferStatus.PARTIALLY_RECEIVED);
        transfer.setUrgency(TransferUrgency.HIGH);
        transfer.setRoutePriority(TransferRoutePriority.MEDIUM);

        shortItem = new TransferItem();
        shortItem.setId(500L);
        shortItem.setTransfer(transfer);
        shortItem.setProduct(product);
        shortItem.setShippedQuantity(new BigDecimal("10"));
        shortItem.setReceivedQuantity(new BigDecimal("7"));
        shortItem.setDifference(new BigDecimal("3"));
        transfer.getItems().add(shortItem);

        when(authentication.getName()).thenReturn(EMAIL);
        lenient().when(transferRepository.findById(TRANSFER_ID)).thenReturn(Optional.of(transfer));

        // lenient: los tests de rechazo fallan antes de resolver el usuario y guardar.
        User user = new User();
        user.setId(9L);
        lenient().when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        lenient().when(transferRepository.save(any(Transfer.class))).thenAnswer(invocation -> {
            Transfer saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(999L);
            }
            return saved;
        });
    }

    @Test
    void noSePuedeSolicitarUnaTransferenciaSiElOrigenNoTieneExistenciasSuficientes() {
        Product alpin = new Product();
        alpin.setId(10L);
        alpin.setName("Alpin 1L");
        when(productRepository.findById(10L)).thenReturn(Optional.of(alpin));
        // el origen no tiene inventario de este producto
        when(inventoryRepository.findByBranchIdAndProductId(ORIGIN_BRANCH, 10L)).thenReturn(Optional.empty());

        TransferCreateRequest request = new TransferCreateRequest(
                ORIGIN_BRANCH, DESTINATION_BRANCH, TransferUrgency.MEDIUM,
                List.of(new TransferItemRequest(10L, new BigDecimal("5"))));

        assertThatThrownBy(() -> transferService.create(request, authentication))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("no tiene existencias suficientes");

        verify(transferRepository, never()).save(any());
    }

    @Test
    void tratamientoAjusteSoloRegistraLaDecisionSinGenerarReenvio() {
        TransferResponse response = transferService.resolveShortage(
                TRANSFER_ID, new TransferShortageResolutionRequest(ShortageResolution.ADJUSTMENT, "Se asume la merma"),
                authentication);

        assertThat(response.shortageResolution()).isEqualTo(ShortageResolution.ADJUSTMENT);
        assertThat(response.shortageResolutionNotes()).isEqualTo("Se asume la merma");
        assertThat(response.shortageResolvedAt()).isNotNull();
        assertThat(response.reshipmentTransferId()).isNull();
        assertThat(transfer.getShortageResolvedBy()).isEqualTo(9L);
        // solo se guarda la transferencia original, no se crea otra
        verify(transferRepository, times(1)).save(any(Transfer.class));
    }

    @Test
    void tratamientoReenvioGeneraTransferenciaDeSeguimientoPorLoFaltante() {
        transferService.resolveShortage(
                TRANSFER_ID, new TransferShortageResolutionRequest(ShortageResolution.RESHIPMENT, null), authentication);

        ArgumentCaptor<Transfer> captor = ArgumentCaptor.forClass(Transfer.class);
        verify(transferRepository, times(2)).save(captor.capture());

        Transfer reshipment = captor.getAllValues().get(0);
        assertThat(reshipment.getStatus()).isEqualTo(TransferStatus.REQUESTED);
        assertThat(reshipment.getOriginBranchId()).isEqualTo(ORIGIN_BRANCH);
        assertThat(reshipment.getDestinationBranchId()).isEqualTo(DESTINATION_BRANCH);
        assertThat(reshipment.getItems()).singleElement()
                .satisfies(item -> assertThat(item.getRequestedQuantity()).isEqualByComparingTo("3"));

        assertThat(transfer.getShortageResolution()).isEqualTo(ShortageResolution.RESHIPMENT);
        assertThat(transfer.getReshipmentTransferId()).isEqualTo(999L);
    }

    @Test
    void noSePuedeTratarElFaltanteSiLaTransferenciaNoEstaEnRecepcionParcial() {
        transfer.setStatus(TransferStatus.FULLY_RECEIVED);

        assertThatThrownBy(() -> transferService.resolveShortage(
                TRANSFER_ID, new TransferShortageResolutionRequest(ShortageResolution.CLAIM, null), authentication))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("no está en recepción parcial");

        verify(transferRepository, never()).save(any());
    }

    @Test
    void noSePuedeTratarElFaltanteDosVeces() {
        transfer.setShortageResolution(ShortageResolution.CLAIM);

        assertThatThrownBy(() -> transferService.resolveShortage(
                TRANSFER_ID, new TransferShortageResolutionRequest(ShortageResolution.ADJUSTMENT, null), authentication))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ya tiene un tratamiento");

        verify(transferRepository, never()).save(any());
    }

    @Test
    void elAdministradorGeneralVeTodasLasTransferencias() {
        when(branchAccessService.isGeneralAdmin(EMAIL)).thenReturn(true);
        when(transferRepository.findAllFiltered(null)).thenReturn(List.of(transfer));

        assertThat(transferService.listAll(null, authentication)).hasSize(1);
        verify(transferRepository, never()).findForBranches(any(), any());
    }

    @Test
    void unaSucursalSoloVeLasTransferenciasQueLeCompeten() {
        when(branchAccessService.isGeneralAdmin(EMAIL)).thenReturn(false);
        when(branchAccessService.getWritableBranchIds(EMAIL)).thenReturn(List.of(DESTINATION_BRANCH));
        when(transferRepository.findForBranches(null, List.of(DESTINATION_BRANCH))).thenReturn(List.of(transfer));

        assertThat(transferService.listAll(null, authentication)).hasSize(1);
        verify(transferRepository, never()).findAllFiltered(any());
    }

    @Test
    void laSucursalOrigenPuedeClasificarLaRutaMientrasLaTransferenciaSigaViva() {
        transfer.setStatus(TransferStatus.IN_PREPARATION);

        TransferResponse response = transferService.updateRoutePriority(
                TRANSFER_ID, new TransferRoutePriorityRequest(TransferRoutePriority.HIGH), authentication);

        assertThat(response.routePriority()).isEqualTo(TransferRoutePriority.HIGH);
        assertThat(transfer.getRoutePriority()).isEqualTo(TransferRoutePriority.HIGH);
    }

    @Test
    void noSePuedeCambiarLaPrioridadDeRutaDeUnaTransferenciaYaFinalizada() {
        // el setUp deja la transferencia en PARTIALLY_RECEIVED (estado terminal)
        assertThatThrownBy(() -> transferService.updateRoutePriority(
                TRANSFER_ID, new TransferRoutePriorityRequest(TransferRoutePriority.LOW), authentication))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("ya está finalizada");

        verify(transferRepository, never()).save(any());
    }

    @Test
    void unOperadorNoPuedeClasificarLaRutaDeUnaTransferencia() {
        transfer.setStatus(TransferStatus.IN_PREPARATION);
        doThrow(new AccessDeniedException("solo gerente o admin"))
                .when(branchAccessService).assertCanManage(EMAIL, ORIGIN_BRANCH);

        assertThatThrownBy(() -> transferService.updateRoutePriority(
                TRANSFER_ID, new TransferRoutePriorityRequest(TransferRoutePriority.HIGH), authentication))
                .isInstanceOf(AccessDeniedException.class);

        verify(transferRepository, never()).save(any());
    }

    @Test
    void laFechaEstimadaDeDespachoNoPuedeSerAnteriorALaSolicitud() {
        transfer.setStatus(TransferStatus.REQUESTED);
        transfer.setRequestDate(LocalDateTime.now());
        Inventory inventory = new Inventory();
        inventory.initializeQuantity(new BigDecimal("100"));
        when(inventoryRepository.findByBranchIdAndProductId(ORIGIN_BRANCH, 10L))
                .thenReturn(Optional.of(inventory));

        TransferPrepareRequest request = new TransferPrepareRequest(
                LocalDateTime.now().minusDays(2),
                List.of(new PrepareItemRequest(shortItem.getId(), new BigDecimal("1"))));

        assertThatThrownBy(() -> transferService.prepare(TRANSFER_ID, request, authentication))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("anterior a la fecha de la solicitud");

        verify(transferRepository, never()).save(any());
    }

    @Test
    void laFechaEstimadaDeLlegadaNoPuedeSerAnteriorAlDespacho() {
        transfer.setStatus(TransferStatus.IN_PREPARATION);

        TransferDispatchRequest request = new TransferDispatchRequest(
                "Servientrega", LocalDateTime.now().minusDays(1));

        assertThatThrownBy(() -> transferService.dispatch(TRANSFER_ID, request, authentication))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("posterior a la fecha de despacho");

        verify(transferRepository, never()).save(any());
    }

    @Test
    void consultarUnaTransferenciaAjenaFallaConAccesoDenegado() {
        when(branchAccessService.isGeneralAdmin(EMAIL)).thenReturn(false);
        // el usuario solo tiene una sucursal que no es ni origen (1) ni destino (2)
        when(branchAccessService.getWritableBranchIds(EMAIL)).thenReturn(List.of(999L));

        assertThatThrownBy(() -> transferService.getById(TRANSFER_ID, authentication))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
    }
}
