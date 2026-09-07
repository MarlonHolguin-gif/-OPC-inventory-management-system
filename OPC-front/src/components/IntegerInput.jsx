import { blockNonIntegerKey, toIntegerString } from '@/lib/numberInput';

/**
 * <input> numérico de enteros no negativos: bloquea el punto decimal y limpia
 * lo que se pegue. `onChange` recibe el mismo evento que un <input> normal,
 * con `event.target.value` ya saneado a dígitos.
 */
export function IntegerInput({ onChange, ...props }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      step="1"
      min="0"
      {...props}
      onKeyDown={blockNonIntegerKey}
      onChange={(event) => {
        const clean = toIntegerString(event.target.value);
        if (clean !== event.target.value) {
          event.target.value = clean;
        }
        onChange(event);
      }}
    />
  );
}
