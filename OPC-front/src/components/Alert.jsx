import { UiStore } from '@/stores/UiStore';

/**
 * Alerta puntual (error o éxito). Se le pasa el texto y opcionalmente un
 * handler de cierre.
 */
export function Alert({ tone = 'error', children, onDismiss }) {
  if (!children) return null;
  const style =
    tone === 'success'
      ? { background: 'var(--accent-dim)', color: 'var(--accent)', borderColor: 'var(--accent-dim)' }
      : undefined;
  return (
    <p role="alert" style={style}>
      {children}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Descartar"
          style={{ marginLeft: 12, border: 'none', background: 'transparent', color: 'inherit', padding: 0 }}
        >
          ✕
        </button>
      )}
    </p>
  );
}

/**
 * Alerta global montada una vez en el layout: muestra lo que haya en
 * `UiStore.error` / `UiStore.success`. Reemplaza el `{error && <p role="alert">}`
 * copiado en cada página.
 */
export function GlobalAlert() {
  const error = UiStore.error.value;
  const success = UiStore.success.value;
  if (!error && !success) return null;
  return (
    <div style={{ padding: '12px 28px 0' }}>
      {error && (
        <Alert tone="error" onDismiss={() => UiStore.clear()}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert tone="success" onDismiss={() => UiStore.clear()}>
          {success}
        </Alert>
      )}
    </div>
  );
}
