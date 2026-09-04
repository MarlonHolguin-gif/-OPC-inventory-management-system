package opcback.system.alerts.service;

import opcback.inventory.service.InventoryAlertService;
import opcback.products.entity.Product;
import opcback.security.BranchAccessService;
import opcback.system.alerts.entity.Notification;
import opcback.system.alerts.entity.NotificationStatus;
import opcback.system.alerts.entity.NotificationType;
import opcback.system.alerts.repository.NotificationRepository;
import opcback.transfers.entity.Transfer;
import opcback.transfers.entity.TransferItem;
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
}
