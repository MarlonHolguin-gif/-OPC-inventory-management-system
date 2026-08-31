import { useEffect } from 'react';
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
 */
export function useRedirect(redirectSignal) {
  const navigate = useNavigate();
  const target = redirectSignal.value;

  useEffect(() => {
    if (target) {
      navigate(target.path, target.options);
    }
  }, [target, navigate]);
}
