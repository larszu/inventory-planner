// ───────────────────────────────────────────────────────────────────────────
// DIE INHALTSLISTE EINES CASES — das Blatt, das in den Deckel kommt.
//
// ─── WARUM DAS NICHT DIE PACKLISTE IST ─────────────────────────────────────
//
// `packList.ts` und `buildPackListHtml` beschreiben einen LAGERORT mit allem
// darin, über beliebig viele Ebenen. Das ist das Blatt für das Dock: man hat
// einen Baum vor sich und arbeitet ihn ab.
//
// Diese Liste beantwortet eine andere Frage, und `types/checkout.ts` schreibt
// sie wörtlich hin: „die Frage bei der Rueckgabe lautet ‚fehlt etwas?'".
// Dafür braucht es kein Inhaltsverzeichnis, sondern eine Liste zum ABHAKEN,
// in einem Case, im Halbdunkel, mit einer Hand. Daraus folgt alles Weitere:
//
//   * EIN Case, nicht der ganze Baum. Unter-Cases stehen als eigene Zeile mit
//     ihrem Code — sie haben ihr eigenes Blatt im eigenen Deckel.
//   * KÄSTCHEN vor jeder Zeile, gross genug für einen Stift.
//   * FREMDES MATERIAL steht als solches da. `derivePackList` rechnet die
//     Herkunft seit Bedarf 67 aus — und `buildPackListHtml` liess sie fallen,
//     gemessen am 2026-09-20. Wer eine Liste abhakt und nicht sieht, dass
//     Position 4 dem Videohaus Meier gehört, packt sie ins eigene Regal.
//   * GEWICHT, soweit gewogen. Ein Case, das jemand allein tragen soll, ist
//     eine Frage, die am Case entschieden wird.
//
// ─── WAS SIE NICHT TUT ─────────────────────────────────────────────────────
//
// Sie summiert kein Gewicht, das nicht dasteht. Was nicht gewogen ist, wird
// GEZÄHLT und nicht geschätzt: unter der Summe steht, wieviele Positionen
// ohne Gewicht eingegangen sind. Eine Summe, die so tut, als wäre sie
// vollständig, ist am Hallenboden gefährlicher als gar keine — jemand hebt
// danach.
//
// REIN: keine Uhr, kein Store, kein IO. Das Datum kommt von aussen.
// ───────────────────────────────────────────────────────────────────────────
import { quelle, type Uebersetzen } from '../../i18n/quelle'
import type { InventoryItem, InventoryUnit, StorageNode } from '../types/inventory'
import { ownershipNote } from './ownership'
import { isContainerKind } from './storageTree'
import { unitLabel } from './unitIdentity'

/** Eine Zeile zum Abhaken. */
export interface InhaltsZeile {
  /** Was dasteht — Modell, oder Modell plus Hausreferenz bei einer Einheit. */
  text: string
  /** Stückzahl. Bei einer Einheit immer 1. */
  qty: number
  /**
   * Fremdes Material im Klartext („Sub-Hire · Videohaus Meier · zurueck
   * 2026-09-12"). Leer bei eigenem.
   */
  ownership?: string
  /** Gewicht dieser Zeile in kg, soweit angegeben — `undefined` = nicht gewogen. */
  weightKg?: number
  /** Ein Unter-Case: es hat sein eigenes Blatt, hier steht nur die Zeile. */
  unterCase?: { id: string; code?: string }
  /** Zustand einer Einheit, wenn sie nicht `ok` ist. */
  condition?: InventoryUnit['condition']
}

export interface CaseInhalt {
  node: StorageNode
  zeilen: InhaltsZeile[]
  /** Summe der Gewichte, die angegeben sind. */
  inhaltKg: number
  /** Wieviele Zeilen KEIN Gewicht tragen. */
  ohneGewicht: number
  /** Leergewicht des Cases, soweit angegeben. */
  leerKg?: number
  /**
   * Gesamtgewicht — nur, wenn Leergewicht UND alle Inhalte gewogen sind.
   *
   * `undefined` heisst „nicht vollständig gewogen" und ist ausdrücklich
   * nicht „leicht". Wer eine Zahl braucht, um zu entscheiden, ob einer
   * allein trägt, bekommt hier keine halbe.
   */
  gesamtKg?: number
  /** Wieviele Stücke insgesamt — die Zahl über den Kästchen. */
  stueckzahl: number
}

export interface CaseInhaltQuellen {
  items: InventoryItem[]
  nodes: StorageNode[]
  units: InventoryUnit[]
}

/**
 * Den Inhalt EINES Cases ableiten — direkt darin, plus die Unter-Cases als
 * eigene Zeilen.
 *
 * NICHT REKURSIV IN DIE UNTER-CASES HINEIN, und das ist der Unterschied zur
 * Packliste: ein Case, dessen Deckelblatt den Inhalt seiner drei Unter-Cases
 * mit aufführt, lässt sich nicht abhaken — man müsste drei Kisten aufmachen,
 * um eine Liste zu prüfen. Jedes Case trägt sein eigenes Blatt.
 *
 * Unbekannter Knoten → `null`. Ein leeres Blatt für ein Case, das es nicht
 * gibt, wäre eine Auskunft über nichts.
 */
export function caseInhalt(
  nodeId: string,
  { items, nodes, units }: CaseInhaltQuellen,
  /** Stichtag für „zurueck seit" (ISO-Datum). Von aussen, damit rein. */
  heute = '',
): CaseInhalt | null {
  const node = nodes.find((n) => n.id === nodeId)
  if (!node) return null

  const itemById = new Map(items.map((it) => [it.id, it]))
  const zeilen: InhaltsZeile[] = []

  // ── Unter-Container zuerst: sie sind die groben Brocken ──
  const kinder = nodes
    .filter((n) => n.parentId === nodeId)
    .sort((a, b) => a.name.localeCompare(b.name))
  for (const k of kinder) {
    zeilen.push({
      text: k.name,
      qty: 1,
      weightKg: k.dimensions?.weightKg,
      ...(isContainerKind(k.kind) ? { unterCase: { id: k.id, code: k.code } } : {}),
    })
  }

  // ── Bulk-Artikel, nach Modell UND Herkunft ──
  //
  // Dieselbe Gruppierung wie in `derivePackList` und aus demselben Grund
  // (Bedarf 67): vier eigene und zwei sub-gemietete Kameras desselben Typs
  // sind nicht sechs Kameras, sondern zwei Zeilen.
  const gruppen = new Map<string, { model: string; qty: number; ownership: string; weightKg?: number }>()
  for (const it of items) {
    if (it.locationId !== nodeId) continue
    const ownership = ownershipNote(it, heute)
    const key = `${it.model}\u0000${ownership}`
    const stueckGewicht = it.dimensions?.weightKg
    const vorhanden = gruppen.get(key)
    if (vorhanden) {
      vorhanden.qty += it.quantity
      // EINE unbekannte Position macht die ganze Zeile unbekannt. Sonst
      // stuende dort ein Gewicht, das fuer weniger Stuecke gilt als die
      // Zahl daneben.
      vorhanden.weightKg =
        vorhanden.weightKg === undefined || stueckGewicht === undefined
          ? undefined
          : vorhanden.weightKg + stueckGewicht * it.quantity
    } else {
      gruppen.set(key, {
        model: it.model,
        qty: it.quantity,
        ownership,
        weightKg: stueckGewicht === undefined ? undefined : stueckGewicht * it.quantity,
      })
    }
  }
  for (const g of [...gruppen.values()].sort(
    (a, b) => a.model.localeCompare(b.model) || a.ownership.localeCompare(b.ownership),
  )) {
    zeilen.push({
      text: g.model,
      qty: g.qty,
      ...(g.ownership ? { ownership: g.ownership } : {}),
      weightKg: g.weightKg,
    })
  }

  // ── Serialisierte Einheiten: jede einzeln, sie sind unterscheidbar ──
  const einheiten = units
    .filter((u) => u.locationId === nodeId)
    .map((u) => {
      const item = itemById.get(u.itemId)
      const model = item?.model ?? '?'
      // Die HAUSREFERENZ, nicht die Herstellernummer (Bedarf 107): der
      // Lagerist liest das Etikett, das dieses Haus geklebt hat.
      const label = `${model} · ${unitLabel(u, 'house')}`
      return {
        text: label,
        qty: 1,
        // Die Einheit erbt die Herkunft ihres Artikels; eine eigene hat sie
        // nicht, und eine erfundene waere schlimmer als keine.
        ...(item ? (() => { const o = ownershipNote(item, heute); return o ? { ownership: o } : {} })() : {}),
        weightKg: item?.dimensions?.weightKg,
        ...(u.condition !== 'ok' ? { condition: u.condition } : {}),
      }
    })
    .sort((a, b) => a.text.localeCompare(b.text))
  zeilen.push(...einheiten)

  let inhaltKg = 0
  let ohneGewicht = 0
  for (const z of zeilen) {
    if (z.weightKg === undefined) ohneGewicht += 1
    else inhaltKg += z.weightKg
  }
  const leerKg = node.dimensions?.weightKg
  const gesamtKg = ohneGewicht === 0 && leerKg !== undefined ? leerKg + inhaltKg : undefined

  return {
    node,
    zeilen,
    inhaltKg,
    ohneGewicht,
    leerKg,
    gesamtKg,
    stueckzahl: zeilen.reduce((n, z) => n + z.qty, 0),
  }
}

/**
 * Die Liste als Text — für die Zwischenablage, eine Mail, eine Notiz.
 *
 * Mit Kästchen aus Zeichen, damit sie auch ausgedruckt aus einem Mailfenster
 * noch abhakbar ist.
 */
export function caseInhaltAlsText(inhalt: CaseInhalt, t: Uebersetzen = quelle): string {
  const kopf = inhalt.node.code ? `${inhalt.node.name}  [${inhalt.node.code}]` : inhalt.node.name
  const zeilen = inhalt.zeilen.map((z) => {
    const menge = z.qty > 1 ? `${z.qty}x ` : ''
    const fremd = z.ownership ? `  (${z.ownership})` : ''
    const zustand = z.condition ? `  [${z.condition}]` : ''
    return `[ ] ${menge}${z.text}${fremd}${zustand}`
  })
  const fuss = [
    inhalt.gesamtKg !== undefined
      ? `${t('caseList.total', 'Total weight')}: ${inhalt.gesamtKg.toFixed(1)} kg`
      : `${t('caseList.contents', 'Contents')}: ${inhalt.inhaltKg.toFixed(1)} kg (${inhalt.ohneGewicht} ${t('caseList.unweighed', 'not weighed')})`,
  ]
  return [kopf, '', ...zeilen, '', ...fuss].join('\n')
}
