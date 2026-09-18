# Inventory Planner

Das Lager als eigenes Werkzeug: **Bestand**, **Ausgabescheine**, **Sub-Hire** —
mit einer Bedienung für den Lageristen statt eines Dialogs im Kabelplan.

**Source language:** `en`

Die Oberfläche startet auf Englisch — auch auf einem deutschen Rechner. Deutsch
ist die erste Übersetzung und steht in **Einstellungen → Language**; die Wahl
überlebt den Neustart. Fehlt zu einem Schlüssel die Übersetzung, erscheint der
englische Quelltext: das ist die Rückfallebene und kein Fehler. Eine weitere
Sprache ist eine Datei unter `src/i18n/` plus ein Eintrag in `WOERTERBUECHER` —
keine Zeile Logik.

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
npm run lang:check     # Quellsprache (englisch, E-28)

npm run electron:dev   # Desktop-Fassung lokal starten (baut vorher)
npm run dist:win       # Windows: Setup + Portable nach release/
npm run dist:mac       # macOS: je ein DMG fuer Intel und Apple Silicon
```

**Hinweis zur Installation.** Hier stand, `npm install` breche ab. Das ist zu
pauschal, und die Korrektur steht hier statt einer stillen Änderung, weil der
alte Satz jemanden davon abhielt, das Naheliegende zu versuchen: **mit der
committeten `package-lock.json` läuft `npm install` durch** — also im normalen
Fall nach einem `clone`.

Es bricht mit `Cannot read properties of null (reading 'edgesOut')` ab, sobald
npm den Peer-Graph OHNE Lockdatei neu auflösen muss (Lockdatei gelöscht,
frisches Verzeichnis). Das ist ein Fehler im Auflöser, nicht in diesem Projekt;
dann hilft `npm install --legacy-peer-deps`. `npm ci` fasst die Auflösung nie
an und ist deshalb der Weg, den CI geht.

*Gemessen am 2026-09-09 mit npm 10.9.7, in beiden Fällen und in beiden neuen
Repos: mit Lockdatei grün, ohne Lockdatei rot.*

## Drei Wege, dasselbe Werkzeug zu benutzen

| Weg | Wie er entsteht | Wofür |
| --- | --- | --- |
| Desktop (Windows/macOS) | Tag `v*` → `.github/workflows/release.yml` | Der Rechner im Lager: Fensterstart, keine Adresszeile |
| Web-Seite | Push auf `main` → `.github/workflows/pages.yml` | Draufschauen, ohne etwas zu installieren |
| Eingebettet in die Suite | `av-planner-suite` vendoriert dieses Repo | Alle Werkzeuge unter einer Oberfläche |

**Sie teilen ihren Bestand nicht.** Die Ablage ist `localStorage`, und Electron
hält die in seinem eigenen `userData`-Bereich — Desktop-Fassung und
Browser-Fassung sind zwei Lager auf demselben Rechner. Das ist keine Panne,
sondern die Eigenschaft der Ablage; der Weg dazwischen ist der Export
(`avplan-inventory`), nicht die Erwartung, es sei dasselbe Fenster.

**Die Web-Seite ist noch nicht live.** Eine GitHub-Pages-Site kann nur ein
Mensch in den Repo-Einstellungen anlegen (*Settings → Pages → Source:
**GitHub Actions***); der `GITHUB_TOKEN` darf es nicht. Solange sie fehlt, baut
`pages.yml` trotzdem und überspringt nur das Veröffentlichen — mit einer
Warnung am Lauf statt einer roten Spalte auf `main`. Sobald die Freigabe da
ist, veröffentlicht der nächste Push von selbst; an der Datei ist nichts zu
ändern.

**Keine gekaufte Signatur.** Die macOS-Pakete tragen eine Ad-hoc-Signatur, die
Windows-Installer gar keine. Beim ersten Start meldet sich der jeweilige
Wächter des Betriebssystems; das ist erwartet und kein Zeichen eines defekten
Downloads.

## Lager — wo liegt es, und was steckt worin?

Die Ansicht **Storage** zeigt den Lagerbaum: Depot, Raum, Regal, Fach, Case,
Transport-Case, und darin die Artikel. **Gezogen wird mit dem Finger** — ein
Lagerort, ein Case oder ein Artikel wandert dorthin, wo er hingehört, mit der
Maus genauso wie auf dem Telefon im Regalgang. (HTML5-`draggable` gibt es auf
einem Touch-Gerät nicht; deshalb Zeiger-Ereignisse, dieselbe Lösung wie in der
Draufsicht der Ladeplanung.)

**Die Absage hat einen Namen, und zwar bevor man loslässt.** Wer ein Case in
sich selbst zieht, liest „Ein Container kann nicht in sich selbst", während
der Finger noch über dem Ziel steht. Ein Vorgang, der ohne Grund nichts tut,
ist von einem kaputten Programm nicht zu unterscheiden — und beim nächsten Mal
räumt jemand wieder von Hand um und trägt es nirgends ein.

**Jeder Umzug geht ins Journal**, mit dem Klartext-Pfad von damals, und lässt
sich als CSV ausgeben. Das ist der Nachweis, der „wo war es zuletzt"
beantwortet, wenn erfasster Ort und Wirklichkeit auseinandergelaufen sind.

Noch ohne Bedienung bleiben `addSet` und `addUnit`: ein Kit ist keine
Lagerstelle und eine serialisierte Einheit ist ein Stück mit Seriennummer —
zwei andere Fragen, die nicht in denselben Baum gehören, nur weil sie im
selben Store liegen.

## Ladeplanung

Was fährt mit — und trägt das Fahrzeug es? Die Ansicht **Load** rechnet einen
Ladeplan und zeigt ihn, statt Koordinaten aufzulisten.

**Der Packer** (`src/domain/lib/loadPacker/`) rechnet **frei in 3D**, nicht im
Raster: die Branche lädt Peli-Cases, weiche Taschen und Stative in Sprinter,
Ducato und Kofferräume, und dort gibt es kein Packmass, sondern Radkästen und
Reste. Verfahren ist eine Extreme-Point-Heuristik mit achsparallelen
Hüllquadern; berücksichtigt werden Stützfläche, Stapelregeln des Cases
(`noLoadOnTop`, `maxStackKg`, `maxLayers`), erlaubte Lagen, die Ladeöffnung,
Hindernisse im Laderaum und das Gewicht.

**Der Laderaum ist kein Quader.** Dachkanten sind gerundet, Wände laufen nach
oben zusammen, ein Kofferraum verjüngt sich zur Heckklappe. Jede der zwölf
Kanten lässt sich gefast (`fase`) oder gerundet (`rundung`) eintragen — bei
den Fahrzeugen, mit zwei Massen und in der Sprache dessen, der misst
(„Dachkante rechts", „Raumecke hinten links"). Packer, Draufsicht und
3D-Ansicht lesen **dieselbe** Rechnung (`src/domain/lib/kontur.ts`): der
Packer analytisch und exakt, die Bilder in Sehnen, die nach innen liegen —
kein Bild zeigt mehr Platz, als es gibt. Ohne Eintrag bleibt die Kante
scharf; Vorgabewerte je Fahrzeugklasse gibt es bewusst nicht.

**Was nicht passt, wird benannt — mit Grund.** „Passt nicht durch die
Heckklappe", „Stützfläche zu klein", „eine Stapelregel des Cases darunter
verbietet es". Ein Plan, der Stücke stillschweigend weglässt, ist am Dock
gefährlicher als gar keiner.

**Die Reihenfolge zählt mehr als die Dichte.** Jedes Stück bekommt eine
Abladegruppe; der Packer legt die zuerst gebrauchte an die Öffnung. Wo das mit
der Passgenauigkeit kollidiert, sagt das Werkzeug, was es kostet, statt
stillschweigend umzuräumen.

**Bedient wird mit der Hand.** In der Draufsicht zieht man ein Case an seinen
Platz — mit der Maus oder mit dem Finger. Ein von Hand gesetztes Stück ist
**verankert**: der Packer fasst es nicht mehr an. Auf Wunsch kommt die
**3D-Ansicht** dazu (Drehen links, Schieben rechts, Zoom auf dem Rad — die
mittlere Maustaste wird nirgends gebraucht).

Three.js liegt hinter einer `lazy`-Grenze und wird erst beim Klick auf
„Show in 3D" geladen: Startpaket 356 kB, 3D-Ansicht 950 kB (gemessen
2026-09-18). `dreiGrenze.node.test.ts` hält das fest.

### Beladen — der Blick aus der Ladeöffnung

Derselbe Plan hat einen zweiten Modus, und der ist für die andere Seite
gedacht: nicht den Schreibtisch, sondern das Heck. Man schaut **aus der
Ladeöffnung** in den Laderaum und sieht drei Dinge:

* **was schon drin steht** — voll ausgefüllt,
* **die eine Lücke**, in die das nächste Stück gehört — als heller Umriss,
* **sonst nichts.** Kisten, die noch nicht dran sind, stehen dieser Frage im
  Bild nur im Weg.

Das Bild baut sich also Stück für Stück auf, während geladen wird. Vermerkt
wird per **Scan** (dieselbe Kamera-Erkennung wie in der Inventur) oder mit
einem Knopf, wenn der Aufkleber hinüber ist. Ein Code, der im Bestand steht
aber nicht zu dieser Fahrt gehört, wird ausdrücklich so gemeldet — „falsches
Fahrzeug?" ist der teurere Fall und darf nicht als „unbekannt" durchgehen.

Darüber läuft der **Lade-Streifen**: der ganze Plan in Ladereihenfolge, jede
Kachel mit ihrem Stand — *geladen · wird geladen · folgt*. Er rollt von selbst
auf das laufende Stück und lässt sich mit dem Daumen schieben; verstaut und
zurückgeholt wird direkt an der Kachel. Er zeigt **alles** und keinen
Ausschnitt: wer eine Kiste sucht, die er vor zehn Minuten falsch abgestellt
hat, findet sie sonst nicht mehr. „Wird geladen" ist dabei kein gespeicherter
Zustand, sondern das nächste Stück nach Plan — eine Ableitung kann nicht
hängenbleiben.

Daneben steht das **Schicht-Modell**: was in welcher Lage steht, und was davon
schon verstaut ist. Beim Laden arbeitet man eine Lage ab und stellt dann die
nächste darauf; wer nur eine Reihe sieht, merkt den Wechsel nicht.

**Aus der Reihe laden ist erlaubt und wird gemeldet.** Wer ein Case einlädt,
hat es in der Hand — vielleicht stand der Hänger im Weg. Das Werkzeug sagt,
was dadurch schwerer wird („zwei Stücke, die davor stehen sollten, fehlen
noch") und lässt den Menschen entscheiden. Ein Werkzeug, das am Dock „nein"
sagt, wird umgangen und weiss danach gar nichts mehr.

**Noch nicht gebaut:** Ladeplan-PDF und Dock-Checkliste (#25), Achslast und
Lastverteilungsplan (#24), das Packmass-Raster als Kandidatenfilter (#21),
Fahrzeug-Stammdaten mit Quelle (#19).

## Marke

Die Oberfläche folgt dem Corporate Design der **Lars Zumpe Medienproduktion**
(Brand Guide 2.0) und damit ADR-007 der Suite: Deep Navy als Grund, Zumpe Navy
als Fläche, Off-White und Eisblau als Schrift, Stahlblau für Meta — **keine
Rundungen, keine Schatten, keine Verläufe**. Struktur entsteht durch die
Linie, Bedeutung durch den Punkt.

**Tally-Rot ist Signal und sonst nichts:** der Punkt im Primärknopf, der
Fokusring, die Öffnungskante in der Draufsicht. Nie Fläche, nie Text, nie
Rahmen — und nie zweimal in einem Sichtfeld. Die Meldefarben (`--warn`,
`--gefahr`, `--ok`) sind ausdrücklich **nicht** dasselbe; wer eine Warnung in
Tally-Rot setzt, nimmt dem Aufnahmelicht seine Bedeutung.

**Der Druckbogen ist die helle Anwendung derselben Palette** (Print 60 %
Off-White, Web 70 % Deep Navy — dieselben Farben, gedrehte Gewichtung), mit
Kicker und Kopflinie und ohne Rot. Hausschrift ist **Public Sans**; sie wird
nicht aus dem Netz geladen, weil dieses Repo offline-first ist, sondern
zuerst genannt und dann auf die Kette des Handbuchs zurückgefallen.

Gemessen wird das von `markenPalette.node.test.ts` — Token-Schicht, Druckbogen,
Schrift und die Regel „ein Signal pro Abschnitt".

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
