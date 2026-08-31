import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

/**
 * Ventana modal. Se monta en `document.body` (portal) para no heredar
 * overflow/stacking del layout. Cierra con Escape, clic fuera o el botón ✕.
 *
 *   {open && (
 *     <Modal title="Nuevo proveedor" onClose={form.close}>
 *       <SupplierForm ... />
 *     </Modal>
 *   )}
 */
export function Modal({ title, onClose, children, size }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal${size === 'wide' ? ' modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
