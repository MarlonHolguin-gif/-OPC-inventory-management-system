import { TextField } from '@/components/Field';
import { FilterField } from '@/components/FilterBar';

/**
 * Par de campos de fecha "Desde / Hasta" para las barras de filtro.
 *
 * Garantiza que "Hasta" nunca quede antes de "Desde":
 *  - el selector nativo lo impide (atributos `min` / `max`), y
 *  - si el valor entra por otra vía (pegar, autocompletar), se corrige al vuelo:
 *    subir "Desde" por encima de "Hasta" arrastra "Hasta"; bajar "Hasta" por
 *    debajo de "Desde" se ignora.
 *
 * `from` / `to` son cadenas `aaaa-mm-dd` (o vacías). `onFromChange` / `onToChange`
 * reciben la nueva cadena.
 */
export function DateRangeFilter({
  fromLabel = 'Desde',
  toLabel = 'Hasta',
  from,
  to,
  onFromChange,
  onToChange,
}) {
  const handleFrom = (value) => {
    onFromChange(value);
    if (value && to && to < value) onToChange(value);
  };

  const handleTo = (value) => {
    if (value && from && value < from) return;
    onToChange(value);
  };

  return (
    <>
      <FilterField>
        <TextField
          label={fromLabel}
          type="date"
          value={from}
          max={to || undefined}
          onChange={handleFrom}
        />
      </FilterField>
      <FilterField>
        <TextField
          label={toLabel}
          type="date"
          value={to}
          min={from || undefined}
          onChange={handleTo}
        />
      </FilterField>
    </>
  );
}
