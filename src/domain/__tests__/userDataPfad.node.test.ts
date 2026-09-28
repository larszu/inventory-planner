import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const main = readFileSync(resolve(__dirname, '..', '..', '..', 'electron', 'main.cjs'), 'utf8')

describe('userData bleibt nach der Umbenennung am alten Ort', () => {
  it('nagelt den Ordner des alten productName fest', () => {
    expect(main).toContain("app.setPath('userData', path.join(app.getPath('appData'), 'Inventory Planner'))")
  })

  it('bevor ein Fenster entsteht', () => {
    expect(main.indexOf("app.setPath('userData'")).toBeLessThan(main.indexOf('app.whenReady()'))
  })
})
