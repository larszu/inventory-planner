# Inventory Planner

Das Lager als eigenes Werkzeug: **Bestand**, **Ausgabescheine**, **Sub-Hire** —
mit einer Bedienung für den Lageristen statt eines Dialogs im Kabelplan.

**Source language:** `de`

## Warum es dieses Repo gibt

Der Schnitt ist in
[ADR-006 „Der Schnitt"](https://github.com/larszu/av-planner-suite/blob/main/docs/decisions/ADR-006-werkzeug-schnitt.md)
entschieden und begründet. Die Kurzfassung: das Lager führt eigene Stammdaten,
die den Plan überdauern, es bedient jemand anderes als den Plan, es ist ohne
den Kabelgraph vollständig, und seine Verbindung zum Plan lässt sich auf
**wenige benannte Fragen** reduzieren:

| Frage | Wer antwortet |
| --- | --- |
| Deckt der Bestand den Bedarf? | das Lager — auf einen Bedarf, den der Plan rechnet |
| Was steht auf dem Ausgabeschein? | das Lager |
| Ist das Stück fremdes Material? | das Lager |

## Die Grenze zum Plan

**Dieses Repo kennt kein Plan-Modell.** Kein `EquipmentItem`, kein
`CablePlannerProject`, keine eigene Bedarfsrechnung. Der Plan rechnet seinen
Bedarf selbst und reicht `BedarfsZeile[]` herüber
(`src/domain/types/bedarf.ts`).

Das ist keine Stilfrage: ein Lager, das dem Geräte-Modell des Kabelplans folgen
muss, ist kein eigenes Werkzeug, sondern ein Anhängsel mit einer Repo-Grenze
davor. `npm run grenze:check` misst es, und CI führt es aus.

## Befehle

```bash
npm ci          # Installation — siehe Hinweis unten
npm run dev     # Vite, Port 4184 (fest, strictPort)
npm run build   # tsc -b && vite build
npm run lint
npm test        # vitest
npm run grenze:check   # die Grenze zum Plan
npm run lang:check     # Quellsprache (deutsch)
```

**Hinweis zur Installation:** `npm install` bricht mit
`Cannot read properties of null (reading 'edgesOut')` ab — ein Fehler im
Abhängigkeits-Auflöser von npm 10.9 an der Peer-Gruppe von `vitest`, nicht in
diesem Projekt. `npm ci` (aus der Lockdatei) läuft durch, und CI benutzt
ohnehin `npm ci`. Wer die Lockdatei erneuern muss:
`npm install --legacy-peer-deps`.

## Stand

Erste Fassung. Übernommen ist die Domäne aus
`cable-planner/src/renderer/lager/` — Bestand, Lagerbaum, serialisierte
Einheiten, Ausgabescheine, Schäden, Sub-Hire — plus eine eigene Oberfläche über
den drei Fragen.

**Noch nicht hier:** der Deckungs-Abgleich gegen einen Plan (er braucht den
Bedarf von der anderen Seite), Scannen, Drucken, und der Umzug der
Cable-Planner-Seite auf dieses Repo. Der Cable-Planner behält seine Kopie,
solange das nicht steht — nach ADR-006 wird einzeln geschnitten, mit grünem CI
dazwischen, und der Planer bleibt in jedem Zwischenstand lauffähig.
