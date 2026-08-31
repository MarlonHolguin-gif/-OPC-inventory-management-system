import { useEffect, useRef } from 'react';
import { useController } from '@/lib/useController';
import { BellIcon } from '@/components/icons/UtilityIcons';
import { NotificationBellController } from './NotificationBellController';
import { notificationTypeBadgeClass, notificationTypeLabel } from './constants';
import './NotificationBell.css';

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

export default function NotificationBell() {
  const controller = useController(NotificationBellController);
  const containerRef = useRef(null);

  const open = controller.open.value;
  const list = controller.list.value;
  const unreadCount = controller.unreadCount.value;
  const expandedId = controller.expandedId.value;

  useEffect(() => {
    if (!open) return undefined;
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        controller.closePanel();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open, controller]);

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        className="icon-button notification-bell-button"
        onClick={controller.toggleOpen}
        aria-label={unreadCount > 0 ? `Notificaciones — ${unreadCount} sin leer` : 'Notificaciones'}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <h3>Notificaciones</h3>
            <span className="count">{unreadCount} sin leer</span>
          </div>

          {list.length === 0 ? (
            <p className="notification-empty">No hay notificaciones.</p>
          ) : (
            <ul className="notification-list">
              {list.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    className={`notification-item${notification.status !== 'READ' ? ' unread' : ''}`}
                    onClick={() => controller.itemClick(notification)}
                  >
                    <span className={notificationTypeBadgeClass(notification.type)}>
                      {notificationTypeLabel(notification.type)}
                    </span>
                    <span className="notification-message">{notification.message}</span>
                    <span className="notification-date">{formatDateTime(notification.generatedAt)}</span>
                  </button>

                  {expandedId === notification.id && (
                    <div className="notification-detail">
                      <p>
                        <strong>Sucursal:</strong> {controller.branchName(notification.branchId)}
                      </p>
                      {notification.productSku && (
                        <p>
                          <strong>Producto:</strong> {notification.productSku} — {notification.productName}
                        </p>
                      )}
                      <p>
                        <strong>Generada:</strong> {formatDateTime(notification.generatedAt)}
                      </p>
                      <p>
                        <strong>Estado:</strong>{' '}
                        {notification.status === 'READ'
                          ? `Leída — ${formatDateTime(notification.readAt)}`
                          : 'Pendiente'}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
