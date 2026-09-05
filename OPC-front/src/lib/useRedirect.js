import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Puente entre un controller (que no debe conocer el router) y la
 * navegación. El controller expone un signal `redirect` y le asigna
 * `{ path, options? }` cuando quiere navegar; la página llama a este hook
 * con ese signal.
 *
 *   // en el controller
 *   this.redirect = signal(null);
 *   // ...tras crear algo:
 *   this.redirect.value = { path: `/transferencias/${id}`, options: { replace: true } };
 *
 *   // en la página
 *   useRedirect(controller.redirect);
 *
 * Cada destino se atiende una sola vez: el controller publica un objeto
 * nuevo por cada intención de navegar, así que basta con recordar el último
 * ya atendido. Sin esta guarda, cada vez que react-router recrea `navigate`
 * (en cada cambio de ruta) el efecto se volvía a disparar con el mismo
 * destino y arrastraba al usuario de vuelta — quedaba "clavado" en la vista
 * de la notificación.
 */
export function useRedirect(redirectSignal) {
  const navigate = useNavigate();
  const target = redirectSignal.value;
  const handledTarget = useRef(null);

  useEffect(() => {
    if (!target || target === handledTarget.current) return;
    handledTarget.current = target;
    navigate(target.path, target.options);
  }, [target, navigate]);
}
