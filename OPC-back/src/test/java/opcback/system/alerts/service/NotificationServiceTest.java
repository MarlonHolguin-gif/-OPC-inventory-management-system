package opcback.system.alerts.service;

import opcback.inventory.service.InventoryAlertService;
import opcback.products.entity.Product;
import opcback.security.BranchAccessService;
import opcback.system.alerts.entity.Notification;
import opcback.system.alerts.entity.NotificationStatus;
import opcback.system.alerts.entity.NotificationType;
import opcback.system.alerts.dto.NotificationResponse;
import opcback.system.alerts.repository.NotificationRepository;
import opcback.purchases.entity.PurchaseOrder;
import opcback.purchases.entity.PurchaseOrderStatus;
import opcback.transfers.entity.Transfer;
import opcback.transfers.entity.TransferItem;
import opcback.transfers.entity.TransferStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Modelo de reconciliación de notificaciones de stock: sy_notifications
 * refleja el estado pendiente actual, no un histórico. Se verifica que
 * reconcileStockNotification crea, reemplaza y borra según el nivel real, y
 * que el resurgir solo toca las que ya estaban leídas.
 *
 * InventoryAlertService es lógica pura sin dependencias — instancia real,
 * no un mock, para ejercitar el criterio de verdad.
 */
@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    private static final Long BRANCH_ID = 1L;
    private static final Long PRODUCT_ID = 7L;

    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private BranchAccessService branchAccessService;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(
                notificationRepository, branchAccessService, new InventoryAlertService());
    }

    private static Product product() {
        Product product = new Product();
        product.setId(PRODUCT_ID);
        product.setSku("BEB-002");
        product.setName("Gaseosa Cola 1.5L");
        return product;
    }

    private static Notification stockNotification(NotificationType type, NotificationStatus status) {
        Notification notification = new Notification();
        notification.setId(50L);
        notification.setType(type);
        notification.setBranchId(BRANCH_ID);
        notification.setStatus(status);
        return notification;
    }

    private ArgumentCaptor<Notification> captureSave() {
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        return captor;
    }

    @Test
    void creaStockBajoCuandoElNivelEstaPorDebajoDelMinimoYNoHayNotificacion() {
        when(notificationRepository.findByProduct_IdAndBranchIdAndTypeIn(anyLong(), anyLong(), any()))
                .thenReturn(List.of());

        notificationService.reconcileStockNotification(
                BRANCH_ID, product(), new BigDecimal("5"), new BigDecimal("10"), BigDecimal.ZERO);

        Notification saved = captureSave().getValue();
        assertThat(saved.getType()).isEqualTo(NotificationType.LOW_STOCK);
        assertThat(saved.getStatus()).isEqualTo(NotificationStatus.PENDING);
        assertThat(saved.getBranchId()).isEqualTo(BRANCH_ID);
    }

    @Test
    void creaSinExistenciasCuandoLaCantidadEsCeroAunqueElMinimoSeaCero() {
        when(notificationRepository.findByProduct_IdAndBranchIdAndTypeIn(anyLong(), anyLong(), any()))
                .thenReturn(List.of());

        notificationService.reconcileStockNotification(
                BRANCH_ID, product(), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);

        assertThat(captureSave().getValue().getType()).isEqualTo(NotificationType.OUT_OF_STOCK);
    }

    @Test
    void borraLaNotificacionCuandoElStockVuelveANivelSano() {
        Notification existing = stockNotification(NotificationType.LOW_STOCK, NotificationStatus.PENDING);
        when(notificationRepository.findByProduct_IdAndBranchIdAndTypeIn(anyLong(), anyLong(), any()))
                .thenReturn(List.of(existing));

        notificationService.reconcileStockNotification(
                BRANCH_ID, product(), new BigDecimal("40"), new BigDecimal("10"), BigDecimal.ZERO);

        verify(notificationRepository).deleteAll(List.of(existing));
        verify(notificationRepository, never()).save(any());
    }

    @Test
    void reemplazaStockBajoPorSinExistenciasCuandoElNivelCaeACero() {
        Notification lowStock = stockNotification(NotificationType.LOW_STOCK, NotificationStatus.PENDING);
        when(notificationRepository.findByProduct_IdAndBranchIdAndTypeIn(anyLong(), anyLong(), any()))
                .thenReturn(List.of(lowStock));

        notificationService.reconcileStockNotification(
                BRANCH_ID, product(), BigDecimal.ZERO, new BigDecimal("10"), BigDecimal.ZERO);

        verify(notificationRepository).deleteAll(List.of(lowStock));
        assertThat(captureSave().getValue().getType()).isEqualTo(NotificationType.OUT_OF_STOCK);
    }

    @Test
    void elChequeoProgramadoResurgeUnaNotificacionLeidaQueSigueVigente() {
        Notification readOne = stockNotification(NotificationType.LOW_STOCK, NotificationStatus.READ);
        readOne.setReadAt(java.time.LocalDateTime.now().minusHours(3));
        when(notificationRepository.findByProduct_IdAndBranchIdAndTypeIn(anyLong(), anyLong(), any()))
                .thenReturn(List.of(readOne));

        notificationService.reconcileStockNotification(
                BRANCH_ID, product(), new BigDecimal("5"), new BigDecimal("10"), BigDecimal.ZERO, true);

        Notification saved = captureSave().getValue();
        assertThat(saved.getStatus()).isEqualTo(NotificationStatus.PENDING);
        assertThat(saved.getReadAt()).isNull();
    }

    @Test
    void elChequeoProgramadoNoTocaUnaNotificacionQueYaEstaSinLeer() {
        Notification pendingOne = stockNotification(NotificationType.LOW_STOCK, NotificationStatus.PENDING);
        when(notificationRepository.findByProduct_IdAndBranchIdAndTypeIn(anyLong(), anyLong(), any()))
                .thenReturn(List.of(pendingOne));

        notificationService.reconcileStockNotification(
                BRANCH_ID, product(), new BigDecimal("5"), new BigDecimal("10"), BigDecimal.ZERO, true);

        // se guarda (se refresca el texto) pero sigue PENDING, sin marca de lectura
        assertThat(captureSave().getValue().getStatus()).isEqualTo(NotificationStatus.PENDING);
    }

    @Test
    void elFaltanteDeTransferenciaGuardaElIdDeLaTransferenciaComoReferencia() {
        Product shorted = product();
        Transfer transfer = mock(Transfer.class);
        when(transfer.getId()).thenReturn(42L);
        when(transfer.getTransferNumber()).thenReturn("TRF-0042");
        when(transfer.getDestinationBranchId()).thenReturn(BRANCH_ID);
        TransferItem item = mock(TransferItem.class);
        when(item.getDifference()).thenReturn(new BigDecimal("3"));
        when(item.getProduct()).thenReturn(shorted);

        notificationService.notifyTransferShortage(transfer, item);

        Notification saved = captureSave().getValue();
        assertThat(saved.getType()).isEqualTo(NotificationType.TRANSFER_SHORTAGE);
        assertThat(saved.getReferenceId()).isEqualTo(42L);
    }

    @Test
    void tratarElFaltanteBorraLasNotificacionesDeEsaTransferencia() {
        notificationService.clearTransferShortage(42L);

        verify(notificationRepository).deleteByTypeAndReferenceId(
                eq(NotificationType.TRANSFER_SHORTAGE), eq(42L));
    }

    // ---- Notificaciones de flujo de trabajo ----

    private static Transfer transfer(Long id, TransferStatus status, Long origin, Long destination) {
        Transfer transfer = mock(Transfer.class);
        when(transfer.getId()).thenReturn(id);
        when(transfer.getStatus()).thenReturn(status);
        when(transfer.getTransferNumber()).thenReturn("TRF-2026-000009");
        lenient().when(transfer.getOriginBranchId()).thenReturn(origin);
        lenient().when(transfer.getDestinationBranchId()).thenReturn(destination);
        return transfer;
    }

    @Test
    void laTransferenciaConReceptionParcialSinTratarNotificaElFaltanteALaSucursalDeDestino() {
        when(notificationRepository.findByTypeAndReferenceId(NotificationType.TRANSFER_PENDING, 9L))
                .thenReturn(List.of());
        Transfer transfer = transfer(9L, TransferStatus.PARTIALLY_RECEIVED, 1L, 2L);
        when(transfer.getShortageResolution()).thenReturn(null);

        notificationService.reconcileTransferNotification(transfer);

        Notification saved = captureSave().getValue();
        assertThat(saved.getBranchId()).isEqualTo(2L);
        assertThat(saved.getMessage()).contains("faltante pendiente de tratamiento");
    }

    @Test
    void laTransferenciaConElFaltanteYaTratadoBorraLaNotificacionDeFlujo() {
        Notification existing = new Notification();
        existing.setType(NotificationType.TRANSFER_PENDING);
        existing.setReferenceId(9L);
        when(notificationRepository.findByTypeAndReferenceId(NotificationType.TRANSFER_PENDING, 9L))
                .thenReturn(List.of(existing));
        Transfer transfer = transfer(9L, TransferStatus.PARTIALLY_RECEIVED, 1L, 2L);
        when(transfer.getShortageResolution()).thenReturn(opcback.transfers.entity.ShortageResolution.ADJUSTMENT);

        notificationService.reconcileTransferNotification(transfer);

        verify(notificationRepository).deleteAll(List.of(existing));
    }

    @Test
    void laTransferenciaSolicitadaNotificaALaSucursalDeOrigen() {
        when(notificationRepository.findByTypeAndReferenceId(NotificationType.TRANSFER_PENDING, 9L))
                .thenReturn(List.of());

        notificationService.reconcileTransferNotification(transfer(9L, TransferStatus.REQUESTED, 1L, 2L));

        Notification saved = captureSave().getValue();
        assertThat(saved.getType()).isEqualTo(NotificationType.TRANSFER_PENDING);
        assertThat(saved.getBranchId()).isEqualTo(1L);
        assertThat(saved.getReferenceId()).isEqualTo(9L);
        assertThat(saved.getProduct()).isNull();
    }

    @Test
    void laTransferenciaEnTransitoMueveLaNotificacionALaSucursalDeDestino() {
        Notification existing = new Notification();
        existing.setId(80L);
        existing.setType(NotificationType.TRANSFER_PENDING);
        existing.setBranchId(1L);
        existing.setStatus(NotificationStatus.PENDING);
        existing.setReferenceId(9L);
        when(notificationRepository.findByTypeAndReferenceId(NotificationType.TRANSFER_PENDING, 9L))
                .thenReturn(List.of(existing));

        notificationService.reconcileTransferNotification(transfer(9L, TransferStatus.IN_TRANSIT, 1L, 2L));

        Notification saved = captureSave().getValue();
        assertThat(saved.getBranchId()).isEqualTo(2L);
        assertThat(saved.getMessage()).contains("en tránsito");
    }

    @Test
    void laTransferenciaRecibidaPorCompletoBorraLaNotificacionDeFlujo() {
        Notification existing = new Notification();
        existing.setType(NotificationType.TRANSFER_PENDING);
        existing.setReferenceId(9L);
        when(notificationRepository.findByTypeAndReferenceId(NotificationType.TRANSFER_PENDING, 9L))
                .thenReturn(List.of(existing));

        notificationService.reconcileTransferNotification(transfer(9L, TransferStatus.FULLY_RECEIVED, 1L, 2L));

        verify(notificationRepository).deleteAll(List.of(existing));
        verify(notificationRepository, never()).save(any());
    }

    @Test
    void laOrdenDeCompraEnBorradorNotificaPendientePorEnviarAlProveedor() {
        PurchaseOrder order = mock(PurchaseOrder.class);
        when(order.getId()).thenReturn(5L);
        when(order.getStatus()).thenReturn(PurchaseOrderStatus.DRAFT);
        when(order.getOrderNumber()).thenReturn("OC-2026-000005");
        when(order.getBranchId()).thenReturn(3L);
        when(notificationRepository.findByTypeAndReferenceId(NotificationType.PURCHASE_ORDER_PENDING, 5L))
                .thenReturn(List.of());

        notificationService.reconcilePurchaseOrderNotification(order);

        Notification saved = captureSave().getValue();
        assertThat(saved.getType()).isEqualTo(NotificationType.PURCHASE_ORDER_PENDING);
        assertThat(saved.getBranchId()).isEqualTo(3L);
        assertThat(saved.getMessage()).contains("enviar al proveedor");
    }

    @Test
    void laOrdenDeCompraRecibidaPorCompletoBorraLaNotificacion() {
        PurchaseOrder order = mock(PurchaseOrder.class);
        when(order.getId()).thenReturn(5L);
        when(order.getStatus()).thenReturn(PurchaseOrderStatus.FULLY_RECEIVED);
        when(order.getOrderNumber()).thenReturn("OC-2026-000005");
        Notification existing = new Notification();
        existing.setType(NotificationType.PURCHASE_ORDER_PENDING);
        existing.setReferenceId(5L);
        when(notificationRepository.findByTypeAndReferenceId(NotificationType.PURCHASE_ORDER_PENDING, 5L))
                .thenReturn(List.of(existing));

        notificationService.reconcilePurchaseOrderNotification(order);

        verify(notificationRepository).deleteAll(List.of(existing));
    }

    @Test
    void elListadoOcultaLasNotificacionesDeFlujoAlOperadorDeInventario() {
        String email = "operador@opc.com";
        when(branchAccessService.isGeneralAdmin(email)).thenReturn(false);
        when(branchAccessService.getWritableBranchIds(email)).thenReturn(List.of(BRANCH_ID));
        when(branchAccessService.isBranchManager(email)).thenReturn(false);
        when(notificationRepository.findByBranchIdInOrderByGeneratedAtDesc(List.of(BRANCH_ID)))
                .thenReturn(List.of(
                        stockNotification(NotificationType.LOW_STOCK, NotificationStatus.PENDING),
                        workflowNotification(NotificationType.TRANSFER_PENDING)));

        List<NotificationResponse> result = notificationService.list(email, null);

        assertThat(result).extracting(NotificationResponse::type)
                .containsExactly(NotificationType.LOW_STOCK);
    }

    @Test
    void elListadoMuestraLasNotificacionesDeFlujoAlGerenteDeSucursal() {
        String email = "gerente@opc.com";
        when(branchAccessService.isGeneralAdmin(email)).thenReturn(false);
        when(branchAccessService.getWritableBranchIds(email)).thenReturn(List.of(BRANCH_ID));
        when(branchAccessService.isBranchManager(email)).thenReturn(true);
        when(notificationRepository.findByBranchIdInOrderByGeneratedAtDesc(List.of(BRANCH_ID)))
                .thenReturn(List.of(
                        stockNotification(NotificationType.LOW_STOCK, NotificationStatus.PENDING),
                        workflowNotification(NotificationType.TRANSFER_PENDING)));

        List<NotificationResponse> result = notificationService.list(email, null);

        assertThat(result).extracting(NotificationResponse::type)
                .containsExactly(NotificationType.LOW_STOCK, NotificationType.TRANSFER_PENDING);
    }

    private static Notification workflowNotification(NotificationType type) {
        Notification notification = new Notification();
        notification.setId(90L);
        notification.setType(type);
        notification.setBranchId(BRANCH_ID);
        notification.setReferenceId(9L);
        notification.setStatus(NotificationStatus.PENDING);
        return notification;
    }
}
