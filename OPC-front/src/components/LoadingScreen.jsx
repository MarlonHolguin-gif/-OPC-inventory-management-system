import { CircuitField } from '@/components/CircuitField';
import { BrandMark } from '@/components/BrandMark';
import './LoadingScreen.css';

/**
 * Pantalla de carga a pantalla completa: el mismo fondo de circuito del
 * acceso, el logo de OPI al centro y una barra indeterminada. La usa
 * `AsyncBoundary` con `variant="screen"` mientras una vista trae sus datos.
 */
export function LoadingScreen({ text = 'Cargando…' }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <CircuitField />
      <div className="loading-screen__content">
        <BrandMark size={64} />
        <div className="loading-screen__bar" aria-hidden="true">
          <span />
        </div>
        <p className="loading-screen__text">{text}</p>
      </div>
    </div>
  );
}
