// ───────────────────────────────────────────────────────────────────────────
// Die Ladung füllen — aus Bestand, aus Bedarf, aus CSV
//
// Reine Funktionen: sie bauen Stücke, sie speichern nichts. Der Store nimmt
// das Ergebnis entgegen.
//
// ─── WAS DIESE DATEI NICHT TUT ─────────────────────────────────────────────
//
// Sie packt nicht. Sie beantwortet nur „was fährt mit und was wissen wir
// darüber" — die Geometrie kommt später (#20, #21). Deshalb steht hier auch
// die Liste der Stücke, die NICHT gerechnet werden können: eine
// unvollständige Eingabe soll nicht als vollständige Planung enden.
// ───────────────────────────────────────────────────────────────────────────

import type { BedarfsZeile } from '../types/bedarf'
import type { InventoryItem, StorageNode } from '../types/inventory'
import { CONTAINER_KINDS } from '../types/inventory'
import type { Ladung, LadungsStueck, Unplanbar } from '../types/load'

let laufend = 0
/** Eine Kennung, die nur innerhalb einer Ladung eindeutig sein muss. */
const neueId = (praefix: string): string => {
  laufend += 1
  return `${praefix}-${Date.now().toString(36)}-${laufend.toString(36)}`
}

/**
 * Container aus dem Lagerbaum in Stücke verwandeln.
 *
 * Ein verschachtelter Container zählt als EIN Stück: wer das Transport-Case
 * lädt, lädt die Cases darin nicht einzeln. Deshalb werden Knoten
 * ausgelassen, deren Vorfahr ebenfalls ausgewählt ist — sonst stünde
 * dasselbe Gewicht zweimal auf der Ladung.
 */
export function stueckeAusContainern(nodes: readonly StorageNode[], ausgewaehlt: readonly string[]): LadungsStueck[] {
  const wahl = new Set(ausgewaehlt)
  const proId = new Map(nodes.map((n) => [n.id, n]))

  const hatAusgewaehltenVorfahr = (n: StorageNode): boolean => {
    let p = n.parentId ? proId.get(n.parentId) : undefined
    const gesehen = new Set<string>()
    while (p && !gesehen.has(p.id)) {
      if (wahl.has(p.id)) return true
      gesehen.add(p.id)
      p = p.parentId ? proId.get(p.parentId) : undefined
    }
    return false
  }

  return nodes
    .filter((n) => wahl.has(n.id) && CONTAINER_KINDS.includes(n.kind) && !hatAusgewaehltenVorfahr(n))
    .map((n) => ({
      id: neueId('c'),
      label: n.name,
      herkunft: 'container' as const,
      nodeId: n.id,
      quantity: 1,
      dimensions: n.dimensions,
      transport: n.transport,
    }))
}

/**
 * Bedarfszeilen des Plans in Stücke verwandeln.
 *
 * Der Bedarf kennt Modell und Menge, aber keine Maße — die stehen am
 * Bestandsartikel. Wo sich einer über `deviceTypeId` oder den Namen finden
 * lässt, werden seine Maße übernommen; wo nicht, bleibt das Stück ohne, und
 * `unplanbar()` meldet es. Geraten wird nichts.
 */
export function stueckeAusBedarf(zeilen: readonly BedarfsZeile[], items: readonly InventoryItem[]): LadungsStueck[] {
  const nachTyp = new Map(items.filter((i) => i.deviceTypeId).map((i) => [i.deviceTypeId!, i]))
  const nachName = new Map(items.map((i) => [i.model.trim().toLowerCase(), i]))

  return zeilen.map((z) => {
    const treffer = (z.deviceTypeId ? nachTyp.get(z.deviceTypeId) : undefined) ?? nachName.get(z.label.trim().toLowerCase())
    return {
      id: neueId('b'),
      label: z.label,
      herkunft: 'bedarf' as const,
      itemId: treffer?.id,
      quantity: z.quantity,
      dimensions: treffer?.dimensions,
    }
  })
}

/** Eine Zeile aus einer fremden Liste, schon in Spalten zerlegt. */
export interface CsvLadungsZeile {
  label?: string
  quantity?: string
  widthMm?: string
  heightMm?: string
  depthMm?: string
  weightKg?: string
  gruppe?: string
}

/** Positive Zahl oder nichts. Eine leere Spalte ist keine Null. */
const zahl = (v: string | undefined): number | undefined => {
  if (v === undefined) return undefined
  const s = v.trim().replace(',', '.')
  if (s === '') return undefined
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/**
 * CSV-Zeilen in Stücke verwandeln.
 *
 * Fehlende Maße bleiben LEER. Sie mit einer Standardkiste aufzufüllen wäre
 * der bequemste Weg zu einer Ladeplanung, die vollständig aussieht und es
 * nicht ist — genau die Art Zahl, die dieses Repo nirgends erzeugt.
 *
 * Eine Zeile ohne Bezeichnung wird übersprungen: sie wäre eine Position, die
 * niemand am Dock wiedererkennt.
 */
export function stueckeAusCsv(zeilen: readonly CsvLadungsZeile[]): LadungsStueck[] {
  return zeilen
    .filter((z) => (z.label ?? '').trim() !== '')
    .map((z) => {
      const dims = {
        widthMm: zahl(z.widthMm),
        heightMm: zahl(z.heightMm),
        depthMm: zahl(z.depthMm),
        weightKg: zahl(z.weightKg),
      }
      const hatEins = dims.widthMm || dims.heightMm || dims.depthMm || dims.weightKg

      return {
        id: neueId('x'),
        label: z.label!.trim(),
        herkunft: 'csv' as const,
        quantity: zahl(z.quantity) ?? 1,
        dimensions: hatEins ? dims : undefined,
        gruppe: z.gruppe?.trim() || undefined,
      }
    })
}

/**
 * Welche Stücke lassen sich nicht rechnen — und warum.
 *
 * Sie bleiben in der Ladung. Sie fallen nur aus der Geometrie heraus, und das
 * muss auf dem Ladeplan stehen: ein Stück, das niemand vermessen hat, fährt
 * trotzdem mit und braucht trotzdem Platz.
 */
export function unplanbar(ladung: Ladung): Unplanbar[] {
  const out: Unplanbar[] = []
  for (const s of ladung.stuecke) {
    const d = s.dimensions
    if (!d || d.widthMm === undefined || d.heightMm === undefined || d.depthMm === undefined) {
      out.push({ stueckId: s.id, label: s.label, grund: 'keine-masse' })
      continue
    }
    if (d.weightKg === undefined) {
      out.push({ stueckId: s.id, label: s.label, grund: 'kein-gewicht' })
    }
  }
  return out
}

/**
 * Gesamtgewicht der Ladung, soweit bekannt.
 *
 * `bekanntKg` zählt nur, was ein Gewicht trägt; `ohneGewicht` sagt, wie viele
 * Stücke fehlen. Beide Zahlen zusammen sind eine Auskunft — die Summe allein
 * wäre eine Behauptung, weil niemand sähe, wie viel nicht darin steckt.
 */
export function gesamtGewicht(ladung: Ladung): { bekanntKg: number; ohneGewicht: number } {
  let kg = 0
  let ohne = 0
  for (const s of ladung.stuecke) {
    const w = s.dimensions?.weightKg
    if (w === undefined) ohne += 1
    else kg += w * s.quantity
  }
  return { bekanntKg: kg, ohneGewicht: ohne }
}

/** Die vorkommenden Abladegruppen, in stabiler Reihenfolge. */
export function gruppen(ladung: Ladung): string[] {
  const gesehen: string[] = []
  for (const s of ladung.stuecke) {
    if (s.gruppe && !gesehen.includes(s.gruppe)) gesehen.push(s.gruppe)
  }
  return gesehen
}
