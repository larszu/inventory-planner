import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ownershipNote, subhireStatus } from '../lib/ownership'

// ───────────────────────────────────────────────────────────────────────────
// Überlebt das Rückgabedatum das Neuladen?
//
// ─── WIE DER DEFEKT AUFGEFALLEN IST ────────────────────────────────────────
//
// Am Deckelblatt der Case-Inhaltsliste (2026-09-20). Dort stand neben einem
// sub-gemieteten Antennen-Set „kein Rueckgabedatum" — bei einem Artikel, dem
// eines eingetragen worden war. Die Liste hatte recht: nach dem Laden war
// keines mehr da.
//
// ─── DASSELBE MUSTER WIE BEI `damaged` UND `mindestmenge` ──────────────────
//
// `healItem` baut JEDEN Artikel Feld für Feld neu auf, und `returnDue` stand
// nicht in der Liste. Geschrieben wurde korrekt, gelesen wurde nie wieder.
// `subhireStatus`, `ownershipNote` und `overdueCheckouts` lesen das Feld und
// hatten eigene, grüne Tests — sie bekamen ihre Artikel im Test von Hand und
// nicht aus dem Speicher.
//
// ─── UND WARUM DAS SCHWERER WIEGT ALS EIN LEERES FELD ──────────────────────
//
// Der Verlust ist STILL und er kippt eine Aussage ins Gegenteil: ein Lager
// ohne Rückgabedaten sieht nicht kaputt aus, sondern wie eines, in dem
// nichts fällig ist. Die Überfälligkeits-Liste stünde auf null und hätte
// recht — über nichts.
// ───────────────────────────────────────────────────────────────────────────
const KEY = 'inventory-planner:inventory'

const bestand = (returnDue: unknown) => ({
  items: [
    {
      id: 'i1',
      model: 'Antennen-Set',
      quantity: 1,
      ownership: 'subhire',
      supplier: 'Videohaus Meier',
      ...(returnDue === undefined ? {} : { returnDue }),
      createdAt: 't',
      updatedAt: 't',
    },
  ],
  nodes: [],
  sets: [],
  units: [],
})

const frischLaden = async () => {
  vi.resetModules()
  const mod = await import('../store/inventoryStore')
  return mod.useInventoryStore.getState().items
}

describe('Das Rückgabedatum überlebt das Laden', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('1. das hinterlegte Datum steht nach dem Laden noch da', async () => {
    localStorage.setItem(KEY, JSON.stringify(bestand('2026-09-30')))
    const items = await frischLaden()
    expect(
      items[0].returnDue,
      'die Heilung hat `returnDue` fallen lassen — dann liest jedes fremde ' +
        'Stueck nach einem Neustart „kein Rueckgabedatum", und die ' +
        'Ueberfaelligkeits-Liste steht auf null und hat ueber nichts recht',
    ).toBe('2026-09-30')
  })

  it('2. und die Auskunft daneben stimmt dann auch', async () => {
    // Die Kette, an der es hängt: Speicher → `healItem` → `subhireStatus` →
    // das, was auf dem Blatt steht.
    localStorage.setItem(KEY, JSON.stringify(bestand('2026-09-30')))
    const items = await frischLaden()
    expect(subhireStatus(items[0], '2026-09-20')).toBe('due')
    expect(ownershipNote(items[0], '2026-09-20')).toContain('2026-09-30')
    expect(ownershipNote(items[0], '2026-09-20')).not.toContain('no return date')
  })

  it('3. überfällig bleibt überfällig', async () => {
    localStorage.setItem(KEY, JSON.stringify(bestand('2026-09-01')))
    const items = await frischLaden()
    expect(subhireStatus(items[0], '2026-09-20')).toBe('overdue')
  })

  it('4. kein Datum heisst KEIN Datum und nicht heute', async () => {
    // Der Unterschied ist der ganze Punkt: ein Stück ohne Rückgabedatum ist
    // nicht „fällig" — es ist eine offene Frage. So steht es auch in der
    // Hausregel: „ein Stück ohne Rückgabedatum ist nicht ‚fällig'".
    localStorage.setItem(KEY, JSON.stringify(bestand(undefined)))
    const items = await frischLaden()
    expect(items[0].returnDue).toBeUndefined()
    expect(subhireStatus(items[0], '2026-09-20')).toBe('no-date')
  })

  it('5. was nicht wie ein ISO-Datum aussieht, ist keins', async () => {
    // `subhireStatus` vergleicht ISO-Zeichenketten. Ein „30.09.2026"
    // verglichen sich still falsch: '3' > '2', also nie überfällig.
    localStorage.setItem(KEY, JSON.stringify(bestand('30.09.2026')))
    const items = await frischLaden()
    expect(items[0].returnDue).toBeUndefined()
    expect(subhireStatus(items[0], '2026-09-20')).toBe('no-date')
  })
})
