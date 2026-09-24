import { beforeEach, describe, expect, it } from 'vitest'
import {
  parseRackBelegung,
  RACK_BELEGUNG_FORMAT,
  RACK_BELEGUNG_VERSION,
  serializeRackBelegung,
  type PlanRack,
} from '../../lib/rackBelegungFormat'
import { usePlanRackStore } from '../store/planRackStore'

// Das Austauschformat liegt zeichengleich im cable-planner
// (src/renderer/lib/rackBelegungFormat.ts), der es schreibt. Dieser Vertrag
// steht dort genauso (tests/rackBelegung.test.ts).
const CONTRACT = {
  format: 'avplan-rack-belegung',
  version: 1,
  envelopeKeys: ['app', 'exportedAt', 'format', 'racks', 'version'],
  rackKeys: ['belegung', 'hoeheHE', 'name', 'planRef', 'tiefeMm'],
  zeileKeys: ['hoeheHE', 'label', 'seite', 'startHE'],
} as const

const rack: PlanRack = {
  planRef: 'rack-1',
  name: 'Funk-Rack',
  hoeheHE: 12,
  tiefeMm: 450,
  belegung: [{ startHE: 11, hoeheHE: 1, label: 'Patch 1 HE', seite: 'rear' }],
}

describe('avplan-rack-belegung Vertrag', () => {
  it('Marker, Version und Feldnamen sind eingefroren', () => {
    expect(RACK_BELEGUNG_FORMAT).toBe(CONTRACT.format)
    expect(RACK_BELEGUNG_VERSION).toBe(CONTRACT.version)
    const datei = JSON.parse(serializeRackBelegung([rack], { app: 'cable-planner', exportedAt: 't' }))
    expect(Object.keys(datei).sort()).toEqual(CONTRACT.envelopeKeys)
    expect(Object.keys(datei.racks[0]).sort()).toEqual(CONTRACT.rackKeys)
    expect(Object.keys(datei.racks[0].belegung[0]).sort()).toEqual(CONTRACT.zeileKeys)
  })

  it('Round-Trip ist verlustfrei', () => {
    expect(parseRackBelegung(serializeRackBelegung([rack]))).toEqual([rack])
  })

  it('lehnt fremdes Format und neuere Version ab', () => {
    expect(parseRackBelegung(JSON.stringify({ format: 'x', version: 1, racks: [] }))).toBeNull()
    expect(parseRackBelegung(JSON.stringify({ format: CONTRACT.format, version: 2, racks: [] }))).toBeNull()
  })
})

describe('der Speicher der Plan-Racks', () => {
  beforeEach(() => {
    localStorage.clear()
    usePlanRackStore.getState().vergessen()
  })

  it('liest eine Datei ein und hält sie über ein Neuladen', () => {
    expect(usePlanRackStore.getState().einlesen(serializeRackBelegung([rack]), '2026-09-24T10:00:00Z')).toBe(true)
    expect(usePlanRackStore.getState().racks).toEqual([rack])
    const roh = JSON.parse(localStorage.getItem('inventory-planner:planRacks')!)
    expect(parseRackBelegung(roh.datei)).toEqual([rack])
    expect(roh.eingelesen).toBe('2026-09-24T10:00:00Z')
  })

  it('eine neue Datei ersetzt den Stand ganz, statt sich zu mischen', () => {
    const st = usePlanRackStore.getState()
    st.einlesen(serializeRackBelegung([rack]))
    st.einlesen(serializeRackBelegung([{ ...rack, planRef: 'rack-2', name: 'Neu' }]))
    expect(usePlanRackStore.getState().racks.map((r) => r.planRef)).toEqual(['rack-2'])
  })

  it('weist eine fremde Datei ab und lässt den Stand stehen', () => {
    const st = usePlanRackStore.getState()
    st.einlesen(serializeRackBelegung([rack]))
    expect(st.einlesen('{"format":"avplan-inventory","version":8}')).toBe(false)
    expect(usePlanRackStore.getState().racks).toEqual([rack])
  })
})
