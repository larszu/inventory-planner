import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { erzeugeInlay } from '../lib/inlay'
import { inlayNetz, offeneKanten, volumen } from '../lib/inlayMesh'
import { build3mf, build3mfModel, buildStl } from '../lib/inlayDruck'
import { beschriftung, buildInlayDxf } from '../lib/inlayDxf'
import { crc32, zipStore } from '../../lib/zipStore'
import type { CaseLage } from '../lib/caseLayout'

/**
 * DIE AUSGABE-DATEIEN — gegen die Anforderungen, nicht gegen sich selbst.
 *
 * ─── WARUM HIER MIT ECHTEM `unzip` GEPRÜFT WIRD ────────────────────────────
 *
 * Ein ZIP ist eine Kette von Offsets. Wer einen um ein Byte verfehlt,
 * bekommt eine Datei, die nicht halb funktioniert, sondern GAR NICHT aufgeht
 * — und man sieht es ihr nicht an. Ein Test, der nur nachzählt, dass Bytes
 * herauskamen, prüft dann nichts. Deshalb wird das Archiv mit dem
 * Systemwerkzeug wieder aufgemacht und der Inhalt verglichen.
 *
 * ─── UND WARUM DIE NETZ-PROBEN HIER STEHEN ─────────────────────────────────
 *
 * Die 3MF-Kernspezifikation verlangt ein manifoldes Netz mit nach aussen
 * zeigenden Normalen. Beides ist prüfbar: jede Kante genau zweimal
 * (`offeneKanten`), und ein POSITIVES Volumen. Ein Netz mit nach innen
 * gedrehten Normalen ist dicht und trotzdem falsch — der Schneider druckt
 * dann die Negativform, und kein Blick auf das Bild verrät es.
 */
const fach = (id: string, xMm: number, zMm: number, b: number, t: number, h = 40) => ({
  stueckId: id,
  label: id,
  nr: 1,
  xMm,
  zMm,
  breiteMm: b,
  tiefeMm: t,
  hoeheMm: h,
  lage: 'upright' as const,
  gedreht: false,
})

const lage: CaseLage = {
  yMm: 0,
  hoeheMm: 60,
  faecher: [fach('Funk A', 20, 20, 100, 80), fach('Funk B', 200, 20, 120, 60, 60)],
}
const innen = { widthMm: 400, heightMm: 300, depthMm: 300 }
const modell = erzeugeInlay(lage, innen, { bodenMm: 10 })!
const netz = inlayNetz(modell)

describe('Das Netz', () => {
  it('ist dicht: jede Kante trifft genau eine Gegenkante', () => {
    expect(offeneKanten(netz)).toBe(0)
  })

  it('zeigt nach AUSSEN — positives Volumen', () => {
    expect(volumen(netz)).toBeGreaterThan(0)
  })

  it('schliesst genau das Volumen ein, das die Platte minus die Taschen hat', () => {
    // Von Hand: 400 × 300 × 70 = 8 400 000, minus die beiden Taschen und
    // ihre Griffmulden. Wenn das Netz um einen Boden oder eine Wand
    // danebenläge, wäre es hier zu sehen — und nur hier.
    const platte = 400 * 300 * (60 + 10)
    let taschen = 0
    for (const t of modell.taschen) {
      taschen += t.breiteMm * t.tiefeMm * t.frästiefeMm
      if (t.griff) taschen += t.griff.breiteMm * t.griff.tiefeMm * t.frästiefeMm
    }
    expect(volumen(netz)).toBeCloseTo(platte - taschen, 0)
  })

  it('bleibt dicht, wenn Taschen verschiedene Tiefen haben', () => {
    const gemischt = inlayNetz(
      erzeugeInlay(
        { yMm: 0, hoeheMm: 60, faecher: [fach('a', 20, 20, 80, 80, 20), fach('b', 200, 20, 80, 80, 55)] },
        innen,
        { bodenMm: 5 },
      )!,
    )
    expect(offeneKanten(gemischt)).toBe(0)
    expect(volumen(gemischt)).toBeGreaterThan(0)
  })

  it('bleibt dicht ohne jede Tasche', () => {
    const leer = inlayNetz(erzeugeInlay({ yMm: 0, hoeheMm: 30, faecher: [] }, innen)!)
    expect(offeneKanten(leer)).toBe(0)
    expect(volumen(leer)).toBeCloseTo(400 * 300 * 30, 0)
  })
})

describe('STL', () => {
  const stl = buildStl(netz, 'probe')

  it('hat die Länge, die das Format vorschreibt', () => {
    // 80 Byte Kopf + 4 Byte Anzahl + 50 Byte je Dreieck.
    expect(stl.length).toBe(84 + netz.dreiecke.length * 50)
  })

  it('nennt im Kopf dieselbe Dreieckszahl, die es schreibt', () => {
    const anzahl = new DataView(stl.buffer, stl.byteOffset).getUint32(80, true)
    expect(anzahl).toBe(netz.dreiecke.length)
  })

  it('beginnt NICHT mit „solid"', () => {
    // Sonst hält mancher Leser die Datei für ASCII-STL und liest Kauderwelsch.
    expect(new TextDecoder().decode(stl.slice(0, 5))).not.toBe('solid')
  })

  it('trägt die Einheit wenigstens im Kopftext — das Format kennt keine', () => {
    expect(new TextDecoder().decode(stl.slice(0, 80))).toContain('(mm)')
  })
})

describe('3MF', () => {
  it('nennt die Einheit Millimeter — das ist der Grund, es STL vorzuziehen', () => {
    expect(build3mfModel(netz)).toContain('unit="millimeter"')
  })

  it('legt gleiche Punkte zusammen, sonst wäre jede Kante formal offen', () => {
    const xml = build3mfModel(netz)
    const punkte = (xml.match(/<vertex /g) ?? []).length
    // Drei Punkte je Dreieck wären es ohne Zusammenlegen.
    expect(punkte).toBeLessThan(netz.dreiecke.length * 3)
    expect(punkte).toBeGreaterThan(0)
  })

  it('zeigt auf keine Punktnummer, die es nicht gibt', () => {
    const xml = build3mfModel(netz)
    const punkte = (xml.match(/<vertex /g) ?? []).length
    for (const m of xml.matchAll(/v[123]="(\d+)"/g)) {
      expect(Number(m[1])).toBeLessThan(punkte)
    }
  })

  it('maskiert einen Namen mit spitzen Klammern', () => {
    expect(build3mfModel(netz, '<Case & Co>')).toContain('&lt;Case &amp; Co&gt;')
  })

  it('ist ein ZIP, das sich mit dem Systemwerkzeug öffnen lässt', () => {
    // Die eigentliche Probe: nicht „es kamen Bytes heraus", sondern „ein
    // fremdes Programm liest es wieder auf".
    const daten = build3mf(netz, 'Probe')
    const ordner = mkdtempSync(join(tmpdir(), 'inlay-'))
    const datei = join(ordner, 'probe.3mf')
    writeFileSync(datei, daten)

    const liste = execFileSync('unzip', ['-Z1', datei], { encoding: 'utf8' }).trim().split('\n')
    expect(liste.sort()).toEqual(['3D/3dmodel.model', '[Content_Types].xml', '_rels/.rels'])

    // `unzip -t` prüft jede Prüfsumme. Ein falscher CRC fiele hier auf.
    const geprueft = execFileSync('unzip', ['-t', datei], { encoding: 'utf8' })
    expect(geprueft).toContain('No errors detected')

    execFileSync('unzip', ['-o', '-q', datei, '-d', ordner])
    const modellXml = readFileSync(join(ordner, '3D', '3dmodel.model'), 'utf8')
    expect(modellXml).toBe(build3mfModel(netz, 'Probe'))
  })

  it('erzeugt bei gleicher Eingabe dieselben Bytes', () => {
    // Ohne festen Zeitstempel wäre das nicht so — und dann liesse sich
    // nicht sagen, ob sich eine Datei wirklich geändert hat.
    const a = build3mf(netz, 'Probe', new Date(2020, 0, 1))
    const b = build3mf(netz, 'Probe', new Date(2020, 0, 1))
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true)
  })
})

describe('zipStore', () => {
  it('rechnet CRC-32 wie die Norm', () => {
    // Der bekannte Prüfwert für „123456789".
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('schreibt ein leeres Archiv, das `unzip` als leer erkennt statt als kaputt', () => {
    // `unzip -t` beendet sich bei einem leeren Archiv mit einem Code
    // ungleich null — das ist seine Art, „leer" zu sagen, und kein Fehler
    // der Datei. Geprueft wird deshalb die MELDUNG und nicht der Code:
    // „Empty zipfile" heisst gelesen, „cannot find" hiesse kaputt.
    const ordner = mkdtempSync(join(tmpdir(), 'zip-'))
    const datei = join(ordner, 'leer.zip')
    writeFileSync(datei, zipStore([]))
    let ausgabe: string
    try {
      ausgabe = execFileSync('unzip', ['-t', datei], { encoding: 'utf8', stdio: 'pipe' })
    } catch (e) {
      ausgabe = String((e as { stdout?: string }).stdout ?? '')
    }
    // Es hat die Datei GEOEFFNET („Archive:") und sie als leer bezeichnet.
    // Haette der Kopf nicht gestimmt, stuende hier „cannot find zipfile
    // directory" — der Unterschied ist genau der, auf den es ankommt.
    expect(ausgabe).toContain('Archive:')
    expect(ausgabe.toLowerCase()).toMatch(/empty/)
    expect(ausgabe).not.toContain('cannot find zipfile directory')
  })
})

describe('DXF', () => {
  const dxf = buildInlayDxf(modell, 'Funk-Case 1')

  it('nennt Millimeter — sonst kommt es um den Faktor 25,4 falsch aus der Fräse', () => {
    expect(dxf).toContain('$INSUNITS')
    expect(dxf).toMatch(/\$INSUNITS\n\s*70\n4/)
    expect(dxf).toMatch(/\$MEASUREMENT\n\s*70\n1/)
  })

  it('benutzt KEINE LWPOLYLINE — die gibt es erst ab R14', () => {
    expect(dxf).not.toContain('LWPOLYLINE')
    expect(dxf).toContain('POLYLINE')
    expect(dxf).toContain('SEQEND')
  })

  it('schliesst jede Kontur', () => {
    // Gruppe 70 mit Bit 1. Eine offene Kontur kann eine CAM-Software nicht
    // als Schnittkontur nehmen.
    const polylinien = (dxf.match(/^0\nPOLYLINE$/gm) ?? []).length
    const geschlossen = (dxf.match(/^70\n1$/gm) ?? []).length
    expect(polylinien).toBe(modell.taschen.length + 1)
    expect(geschlossen).toBeGreaterThanOrEqual(polylinien)
  })

  it('trennt Schnitt, Rand und Beschriftung auf eigene Ebenen', () => {
    for (const ebene of ['SCHNITT', 'RAND', 'BESCHRIFTUNG']) expect(dxf).toContain(ebene)
  })

  it('endet mit EOF', () => {
    expect(dxf.trimEnd().endsWith('EOF')).toBe(true)
  })

  it('schreibt jede Tasche und ihren Namen', () => {
    for (const t of modell.taschen) expect(dxf).toContain(t.label)
  })
})

describe('Das Netz an einer ECHTEN Lage', () => {
  /**
   * Der Fall, an dem die Oberfläche 36 offene Kanten zeigte (2026-09-22).
   *
   * Die Handvoll Taschen der Einzeltests war zu gutmütig: erst mit mehreren
   * Taschen NEBENEINANDER in verschiedenen Tiefen entstehen die Stellen, an
   * denen eine Aussenwand auf eine Stufe trifft.
   */
  const echt: CaseLage = {
    yMm: 0,
    hoeheMm: 60,
    faecher: [
      fach('EW500 1', 0, 0, 212, 190, 44),
      fach('EW500 2', 227, 0, 212, 190, 44),
      fach('Antenne', 0, 205, 300, 205, 60),
      fach('SM58 1', 315, 205, 50, 162, 50),
      fach('SM58 2', 380, 205, 50, 162, 50),
      fach('SM58 3', 445, 205, 50, 162, 50),
      fach('SM58 4', 510, 205, 50, 162, 50),
    ],
  }

  it('ist auch dort dicht', () => {
    const m = erzeugeInlay(echt, { widthMm: 560, heightMm: 310, depthMm: 460 }, { bodenMm: 10 })!
    const n = inlayNetz(m)
    expect(offeneKanten(n)).toBe(0)
    expect(volumen(n)).toBeGreaterThan(0)
  })
})

describe('Die Beschriftung im DXF', () => {
  it('passt einen langen Namen in eine schmale Tasche, statt überzulaufen', () => {
    // Der gemessene Fall: „Shure SM58 (1/4)" in einer 52 × 164 mm Tasche
    // stand in 13 mm Höhe da — rund 125 mm Text, die Nachbarnamen liefen
    // ineinander.
    const { hoehe, drehung } = beschriftung('Shure SM58 (1/4)', 52, 164)
    expect(drehung).toBe(90)
    // Geschätzte Textlänge muss auf die lange Seite passen.
    expect('Shure SM58 (1/4)'.length * 0.6 * hoehe).toBeLessThanOrEqual(164)
    // Und die Schrifthöhe auf die kurze.
    expect(hoehe).toBeLessThanOrEqual(52)
  })

  it('schreibt waagrecht, wenn die Tasche breiter als tief ist', () => {
    expect(beschriftung('Mischer', 300, 120).drehung).toBe(0)
  })

  it('wird nie kleiner als 3 mm — darunter liest es am Schaum niemand', () => {
    expect(beschriftung('Ein sehr langer Gerätename mit Zusatz', 20, 20).hoehe).toBe(3)
  })

  it('schreibt die Drehung als Gruppe 50 nur, wenn gedreht wird', () => {
    const hoch = buildInlayDxf(erzeugeInlay(
      { yMm: 0, hoeheMm: 60, faecher: [fach('Schmal', 20, 20, 50, 160)] },
      { widthMm: 400, heightMm: 300, depthMm: 300 },
    )!)
    const breit = buildInlayDxf(erzeugeInlay(
      { yMm: 0, hoeheMm: 60, faecher: [fach('Breit', 20, 20, 200, 60)] },
      { widthMm: 400, heightMm: 300, depthMm: 300 },
    )!)
    // Paarweise lesen: eine Zeile "50" kann auch ein Koordinatenwert sein.
    const drehungen = (dxf: string): string[] => {
      const z = dxf.split('\n')
      const aus: string[] = []
      let inText = false
      for (let i = 0; i + 1 < z.length; i += 2) {
        const code = z[i].trim()
        const wert = z[i + 1].trim()
        if (code === '0') inText = wert === 'TEXT'
        else if (inText && code === '50') aus.push(wert)
      }
      return aus
    }
    expect(drehungen(hoch)).toEqual(['90'])
    expect(drehungen(breit)).toEqual([])
  })
})
