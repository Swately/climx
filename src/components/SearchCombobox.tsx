import { useId, useRef, useState } from 'react';
import { navigate } from '../router/router';
import { searchMunicipios } from '../lib/data/search';
import type { IndexRow } from '../lib/data/types';
import Text from '../primitives/Text';
import styles from './SearchCombobox.module.css';

// Hand-rolled ARIA combobox (M1 item 4 by construction): role=combobox input +
// role=listbox popup, full keyboard support (arrows, Enter, Escape), diacritic-
// insensitive matching. Selecting navigates to the composite-keyed route (W1).
export default function SearchCombobox({ index }: { index: IndexRow[] }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = open ? searchMunicipios(index, query) : [];

  function choose(row: IndexRow) {
    setOpen(false);
    setQuery('');
    navigate(`/estado/${row[0]}/municipio/${row[1]}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!results.length) {
      if (e.key === 'Escape') setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = results[active];
      if (row) choose(row);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <label htmlFor={`${listId}-input`}>
        <Text as="span" bold>
          Busca tu municipio
        </Text>
      </label>
      <input
        id={`${listId}-input`}
        ref={inputRef}
        className={styles.input}
        type="text"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls={listId}
        aria-activedescendant={results.length ? `${listId}-opt-${active}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Ej. Toluca, Oaxaca de Juárez…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
      />
      <ul id={listId} role="listbox" aria-label="municipios sugeridos" className={styles.list}>
        {results.map((row, i) => (
          <li
            key={`${row[0]}/${row[1]}`}
            id={`${listId}-opt-${i}`}
            role="option"
            aria-selected={i === active}
            className={i === active ? styles.optionActive : styles.option}
            // onMouseDown fires before the input's blur closes the list.
            onMouseDown={(e) => {
              e.preventDefault();
              choose(row);
            }}
            onMouseEnter={() => setActive(i)}
          >
            {row[2]} <span className={styles.state}>{row[3]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Made with my soul - Swately <3
