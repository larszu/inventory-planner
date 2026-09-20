// ───────────────────────────────────────────────────────────────────────────
// Die Bildeinstellung der 3D-Ladeansicht (#23).
//
// Sie steht in einer reinen Funktion und nicht in der Komponente, damit
// genau das hier möglich ist: nachrechnen, ob der Laderaum ins Bild passt.
// Eine Kameraeinstellung, die man nur ansehen kann, ist eine, die beim
// nächsten Fahrzeug still danebenliegt.
// ───────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import { abstandFuer, blickAuf, blickAusOeffnung, FOV_GRAD, mm } from '../../ui/Ladeansicht/kamera'

/** Die halbe sichtbare Höhe in `abstand` Metern Entfernung. */
const halbeSicht = (abstand: number) => abstand * Math.tan((FOV_GRAD * Math.PI) / 180 / 2)

describe('Bildeinstellung', () => {
  it('rechnet Millimeter in Meter', () => {
    expect(mm(4300)).toBe(4.3)
  })

  it('bringt einen Sprinter-Laderaum ganz ins Bild', () => {
    const [l, b, h] = [4.3, 1.78, 1.94]
    const blick = blickAuf(l, b, h)
    const abstand = Math.hypot(...blick.position)
    const radius = Math.hypot(l, b, h) / 2

    // Die Umkugel muss hineinpassen — aus jeder Drehrichtung.
    expect(halbeSicht(abstand)).toBeGreaterThan(radius)
  })

  it('bleibt nah genug dran, dass der Raum das Bild füllt', () => {
    // Die Gegenprobe: zu weit weg ist genauso falsch wie zu nah. Mehr als
    // das Anderthalbfache der Umkugel ist verschenkte Fläche.
    const blick = blickAuf(4.3, 1.78, 1.94)
    const abstand = Math.hypot(...blick.position)
    const radius = Math.hypot(4.3, 1.78, 1.94) / 2

    expect(halbeSicht(abstand)).toBeLessThan(radius * 1.5)
  })

  it('geht bei einem Kofferraum genauso auf wie beim Sattelzug', () => {
    for (const [l, b, h] of [[1.0, 1.0, 0.5], [13.6, 2.48, 2.7]]) {
      const blick = blickAuf(l!, b!, h!)
      const abstand = Math.hypot(...blick.position)
      const radius = Math.hypot(l!, b!, h!) / 2
      expect(halbeSicht(abstand)).toBeGreaterThan(radius)
      expect(halbeSicht(abstand)).toBeLessThan(radius * 1.5)
    }
  })

  it('schaut auf die Mitte des Laderaums', () => {
    expect(blickAuf(4, 2, 2).ziel).toEqual([0, 0, 0])
  })

  it('rückt bei einem schmalen Fenster weiter weg', () => {
    const breit = Math.hypot(...blickAuf(4.3, 1.78, 1.94, 16 / 9).position)
    const schmal = Math.hypot(...blickAuf(4.3, 1.78, 1.94, 0.5).position)
    expect(schmal).toBeGreaterThan(breit)
  })

  it('`abstandFuer` wächst mit dem Mass', () => {
    expect(abstandFuer(4)).toBeGreaterThan(abstandFuer(2))
  })
})

describe('Der Blick aus der Ladeöffnung', () => {
  const [l, b, h] = [4.3, 1.78, 1.94]

  it('steht VOR der Öffnung und nicht darin', () => {
    // Die Öffnung liegt eine halbe Länge vor der Mitte. Wer dort steht,
    // steht mit dem Kopf im Türrahmen.
    const blick = blickAusOeffnung(l, b, h)
    expect(blick.position[2]).toBeGreaterThan(l / 2)
  })

  it('füllt das Bild mit dem Querschnitt, nicht mit der Diagonale', () => {
    // Die Gegenprobe zum ersten Anlauf: mit der Umkugel gerechnet stand der
    // Laderaum klein in der Mitte. Der Abstand VOR der Öffnung muss dem
    // Querschnitt folgen und deutlich kleiner sein als die Umkugel-Rechnung.
    const blick = blickAusOeffnung(l, b, h)
    const vorDerOeffnung = blick.position[2] - l / 2
    const umkugel = Math.hypot(l, b, h) / 2 / Math.sin((FOV_GRAD * Math.PI) / 180 / 2)

    expect(vorDerOeffnung).toBeLessThan(umkugel)
    // Und die Öffnung passt trotzdem ganz ins Bild.
    const halbeSichtDort = vorDerOeffnung * Math.tan((FOV_GRAD * Math.PI) / 180 / 2)
    expect(halbeSichtDort).toBeGreaterThanOrEqual(h / 2)
  })

  it('schaut auf die Mitte des Laderaums', () => {
    expect(blickAusOeffnung(l, b, h).ziel).toEqual([0, 0, 0])
  })

  it('steht höher als die Mitte — sonst sieht man nur die vorderste Reihe', () => {
    expect(blickAusOeffnung(l, b, h).position[1]).toBeGreaterThan(0)
  })

  it('rückt bei einem schmalen Fenster weiter zurück', () => {
    const breit = blickAusOeffnung(l, b, h, 16 / 9).position[2]
    const schmal = blickAusOeffnung(l, b, h, 0.5).position[2]
    expect(schmal).toBeGreaterThan(breit)
  })
})
