// ───────────────────────────────────────────────────────────────────────────
// Vom Typ zum Fahrzeug — und wieder heraus (#19).
//
// ─── DREI DINGE, DIE ZUSAMMENGEHÖREN ───────────────────────────────────────
//
//   ausKatalog   aus einem Stammdatensatz ein eigenes Fahrzeug ableiten
//   vermessen()  die sechs Masse, in der Reihenfolge, in der man sie nimmt
//   portabel     eigene Fahrzeuge aus- und wieder einlesen
//
// ─── WARUM ABLEITEN UND NICHT VERWENDEN ────────────────────────────────────
//
// Weil der eigene Bus ausgebaut ist. Ein Katalog-Eintrag ist der Typ; was in
// der Halle steht, hat eine Regalwand hinten links, eine Trennwand weniger
// und 40 mm weniger Höhe, seit die Dachluke drin ist. Abgeleitet heisst:
// die Zahlen des Typs als START, und ab da gehören sie dem Fahrzeug. Sie
// bleiben NICHT verbunden — eine spätere Korrektur am Katalog darf ein
// ausgemessenes Fahrzeug nicht überschreiben.
//
// Die Quelle wandert mit und wird dabei EHRLICHER: aus „Datenblatt" wird
// „abgeleitet von …", weil ab dem ersten eigenen Mass keine Zahl mehr
// belegt ist, nur noch der Ausgangspunkt.
//
// REIN: keine Uhr, kein Store, kein IO.
// ───────────────────────────────────────────────────────────────────────────
import { format, quelle as quellSprache, type Uebersetzen } from '../../i18n/quelle'
import type { KatalogFahrzeug } from '../data/fahrzeugKatalog'
import type { Vehicle } from '../types/vehicle'

/** Was `addVehicle` entgegennimmt — ohne Id und ohne Zeitstempel. */
type NeuesFahrzeug = Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Ein eigenes Fahrzeug aus einem Stammdatensatz ableiten.
 *
 * `name` überschreibt den Typnamen: in der Halle steht nicht „Sprinter
 * L2H2", sondern „der weisse" oder „B-XY 123".
 */
export function ausKatalog(
  e: KatalogFahrzeug,
  name?: string,
  t: Uebersetzen = quellSprache,
): NeuesFahrzeug {
  return {
    name: name?.trim() || e.name,
    kind: e.kind,
    cargoMm: { ...e.cargoMm },
    kanten: e.kanten?.map((k) => ({ ...k })),
    obstructions: e.obstructions.map((o) => ({ ...o })),
    aperture: e.aperture ? { ...e.aperture } : undefined,
    nutzlastKg: e.nutzlastKg,
    leergewichtKg: e.leergewichtKg,
    zulGesamtgewichtKg: e.zulGesamtgewichtKg,
    axles: e.axles?.map((a) => ({ ...a })),
    ladeflaecheAbVorderachseMm: e.ladeflaecheAbVorderachseMm,
    rasterMm: e.rasterMm,
    flatFloor: e.flatFloor,
    hebebuehneKg: e.hebebuehneKg,
    fuehrerscheinKlasse: e.fuehrerscheinKlasse,
    quelle: format(t('fleet.derivedFrom', 'derived from {source}'), { source: e.quelle }),
    notes: e.notes,
  }
}

/** Ein Mass, das jemand mit dem Zollstock nimmt. */
export interface Messschritt {
  /** Wonach gefragt wird. */
  was: string
  /** Wo genau angesetzt wird — die Stelle, an der die meisten falsch messen. */
  wo: string
}

/**
 * Die sechs Masse, in der Reihenfolge, in der man sie nimmt (#19).
 *
 * ─── WARUM DIE REIHENFOLGE ZÄHLT ───────────────────────────────────────────
 *
 * Weil man einmal ums Fahrzeug geht und nicht dreimal. Erst die Öffnung, an
 * der man steht, dann hinein: Länge, Breite unten, Breite oben, Höhe. Zum
 * Schluss das, wofür man sich bücken muss.
 *
 * ─── UND WARUM ZWEI BREITEN ────────────────────────────────────────────────
 *
 * Die Bodenbreite ZWISCHEN den Radkästen ist eine andere Zahl als die Breite
 * darüber, und sie ist die, an der eine Euro-Palette scheitert. Wer nur eine
 * misst, misst die falsche: die obere passt immer, die untere entscheidet.
 * Im Modell ist die obere `cargoMm.widthMm`, die untere steht als Radkasten
 * unter den Hindernissen — dort, wo sie auch im Weg ist.
 *
 * Als FUNKTION und nicht als Tabelle: dieselbe Hausregel wie bei jeder
 * Beschriftung.
 */
export function vermessen(t: Uebersetzen = quellSprache): Messschritt[] {
  return [
    {
      was: t('measure.apertureW', 'Width of the rear opening'),
      wo: t('measure.apertureW.where', 'Between the door seals at their narrowest, not the body width.'),
    },
    {
      was: t('measure.apertureH', 'Height of the rear opening'),
      wo: t('measure.apertureH.where', 'From the loading sill to the lowest point of the frame.'),
    },
    {
      was: t('measure.length', 'Cargo length'),
      wo: t(
        'measure.length.where',
        'From the bulkhead to the closed doors, at floor level. The floor is what a case stands on.',
      ),
    },
    {
      was: t('measure.widthFloor', 'Floor width between the wheel arches'),
      wo: t(
        'measure.widthFloor.where',
        'The narrowest point at floor level. This is the figure a Euro pallet fails on — record the wheel arch as an obstruction.',
      ),
    },
    {
      was: t('measure.widthTop', 'Width above the wheel arches'),
      wo: t('measure.widthTop.where', 'At about waist height, wall to wall. This is the cargo width in the model.'),
    },
    {
      was: t('measure.height', 'Cargo height'),
      wo: t('measure.height.where', 'From the floor to the lowest fixture — a roof light or a cross member counts.'),
    },
  ]
}

export const FAHRZEUG_FORMAT = 'avplan-vehicles'
export const FAHRZEUG_FORMAT_VERSION = 1

interface FahrzeugDatei {
  format: string
  version: number
  vehicles: readonly Vehicle[]
}

/**
 * Eigene Fahrzeuge als portables JSON.
 *
 * Ein eigenes Format und nicht `avplan-inventory`: ein Fahrzeug ist kein
 * Lagerbestand, und das portable Lager-Format byte-gleich in allen Planern
 * zu halten, ist eine Zusage, die man nicht nebenbei um ein Feld erweitert.
 */
export const buildFahrzeugDatei = (vehicles: readonly Vehicle[]): string =>
  JSON.stringify(
    { format: FAHRZEUG_FORMAT, version: FAHRZEUG_FORMAT_VERSION, vehicles } satisfies FahrzeugDatei,
    null,
    2,
  )

/**
 * Liest die Datei zurück. Streng beim Marker, tolerant beim Rest: die
 * Feld-für-Feld-Heilung macht der Store beim Import — dieselbe Logik wie
 * beim Laden aus `localStorage`, und damit auch dieselbe Strenge.
 */
export const parseFahrzeugDatei = (json: string): Vehicle[] | null => {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  const f = data as Partial<FahrzeugDatei>
  if (f.format !== FAHRZEUG_FORMAT) return null
  if (typeof f.version !== 'number' || f.version > FAHRZEUG_FORMAT_VERSION) return null
  return Array.isArray(f.vehicles) ? (f.vehicles as Vehicle[]) : []
}
