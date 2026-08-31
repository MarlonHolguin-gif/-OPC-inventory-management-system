package opcback.system.alerts.dto;

import opcback.system.alerts.entity.Notification;
import opcback.system.alerts.entity.NotificationChannel;
import opcback.system.alerts.entity.NotificationStatus;
import opcback.system.alerts.entity.NotificationType;

import java.time.LocalDateTime;

public record NotificationResponse(
        Long id,
        NotificationType type,
        Long branchId,
        Long productId,
        String productSku,
        String productName,
        String message,
        NotificationChannel channel,
        NotificationStatus status,
        LocalDateTime generatedAt,
        LocalDateTime readAt
) {
    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getBranchId(),
                notification.getProduct() != null ? notification.getProduct().getId() : null,
                notification.getProduct() != null ? notification.getProduct().getSku() : null,
                notification.getProduct() != null ? notification.getProduct().getName() : null,
                notification.getMessage(),
                notification.getChannel(),
                notification.getStatus(),
                notification.getGeneratedAt(),
                notification.getReadAt());
    }
}
