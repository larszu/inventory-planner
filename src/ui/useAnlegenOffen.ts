import { useState, type SyntheticEvent } from 'react'

/**
 * Auf/zu eines Anlegen-Blocks (`<details>`).
 *
 * Offen, solange die Liste leer ist — dann ist Anlegen das Einzige, was zu
 * tun ist. Danach entscheidet, wer ihn bedient. Vorher sprang der Block per
 * `key` nach dem ERSTEN Eintrag zu, also genau dann, wenn jemand gerade
 * dabei war, den zweiten anzulegen.
 */
export function useAnlegenOffen(leer: boolean) {
  const [offen, setOffen] = useState(leer)
  // Wird die Liste wieder leer, geht der Block wieder auf — im Rendern
  // nachgezogen statt per Effekt, damit kein zweiter Durchlauf entsteht.
  const [warLeer, setWarLeer] = useState(leer)
  if (leer !== warLeer) {
    setWarLeer(leer)
    if (leer) setOffen(true)
  }
  return {
    open: offen,
    onToggle: (e: SyntheticEvent<HTMLDetailsElement>) => setOffen(e.currentTarget.open),
  }
}
